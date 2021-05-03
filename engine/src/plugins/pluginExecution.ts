import path from 'path'
import queue from 'queue'
import { performance } from 'perf_hooks'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import {
    Plugin, pluginConfig, EventType, EventData, pluginLogger, fileUtil,
    SeverityEnum, systemUtil, osUtil, shouldEventBeIgnored, generalConfig, generalLogger
} from '../shared'

// --------------------------------------------------------------------------------------------------------------------

type CommandType = `js` | `cmd` | `bat` | `nixShell` | `exe` | `nixEx`;

const logArea = `pluginExecute`;
const pluginQueues: { [pluginName: string]: queue } = {};

const isFilePathExcludedFromWatchPath = (filePath: string | null, excludePaths: string[] | null): boolean => {
    return fileUtil.doesPathExist(filePath)
        && fileUtil.isDirectoryInPath(filePath, fileUtil.interpolateHomeTilde(excludePaths) as string[]);
}

const isFilePathNotInWatchPaths = (filePath: string | null, watchPaths: string[] | null): boolean => {
    return filePath && !fileUtil.isDirectoryInPath(filePath, fileUtil.interpolateHomeTilde(watchPaths) as string[]);
}

const isPluginDisabled = (enabled: boolean | undefined): boolean => enabled !== undefined && enabled === false;

const getCommandType = (execFilePath: string): CommandType => {
    if (execFilePath.endsWith(`.cmd`)) return `cmd`;
    if (execFilePath.endsWith(`.bat`)) return `bat`;
    if (execFilePath.endsWith(`.exe`)) return `exe`;
    if (execFilePath.endsWith(`.js`)) return `js`;
    if (execFilePath.match(/.(sh|zsh|tcsh)$/)) return `nixShell`;

    return `nixEx`;
}

const buildEnvironmentVariables = (startingObject: {}, jsonConfig: string, event: EventType, eventData: EventData): object => {
    try {
        const preparedEventData = {};
        for (const property in eventData) {
            if (eventData[property]) preparedEventData[`ganchos_${property}`] = eventData[property];
        }

        const jsonConfigObj = jsonConfig && JSON.parse(jsonConfig) || {};
        const preparedConfigData = {};
        for (const property in jsonConfigObj) {
            if (jsonConfigObj[property]) preparedConfigData[`ganchosConfig_${property}`] = jsonConfigObj[property];
        }

        return {
            ...startingObject,
            env: {
                ...process.env,
                ganchos_eventType: event,
                ...preparedEventData,
                ...preparedConfigData,
            }
        }
    } catch (e) {
        generalLogger.write(SeverityEnum.error, `${logArea} - ${buildEnvironmentVariables.name}`, e);
    }
}

const getPluginExecPath = (pluginPath: string, execFilePath: string): string | null => {
    try {
        if (fileUtil.doesPathExist(execFilePath)) return execFilePath;

        const relativePath = path.join(pluginPath, execFilePath);
        if (fileUtil.doesPathExist(relativePath)) return relativePath;

        return null;
    } catch (e) {
        generalLogger.write(SeverityEnum.error, `${logArea} - ${getPluginExecPath.name}`, e);
    }
}

const makeCommandParams = async (jsonConfig: string, plugin: Plugin, event: string, eventData: EventData): Promise<string[]> => {
    const config = jsonConfig || plugin.defaultConfig;
    return [`"${config}"`, `"${event}"`, `"${JSON.stringify(eventData)}"`];
}

const getStandardSpawn = async (jsonConfig: string, plugin: Plugin, event: EventType, eventData: EventData): Promise<ChildProcessWithoutNullStreams> => {
    try {
        return plugin.putDataInEnvironment
            ? spawn(`"${getPluginExecPath(plugin.path, plugin.execFilePath)}"`, [], buildEnvironmentVariables({}, jsonConfig, event, eventData))
            : spawn(`"${getPluginExecPath(plugin.path, plugin.execFilePath)}"`, await makeCommandParams(jsonConfig, plugin, event, eventData));
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, plugin.name, `${logArea} - ${getStandardSpawn.name}`, e);
    }
}

const getScriptSpawn = async (jsonConfig: string, plugin: Plugin, event: EventType, eventData: EventData): Promise<ChildProcessWithoutNullStreams> => {
    try {
        return plugin.putDataInEnvironment
            ? spawn(`"${getPluginExecPath(plugin.path, plugin.execFilePath)}"`, [], buildEnvironmentVariables({ shell: true }, jsonConfig, event, eventData))
            : spawn(`"${getPluginExecPath(plugin.path, plugin.execFilePath)}"`, await makeCommandParams(jsonConfig, plugin, event, eventData), { shell: true });
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, plugin.name, `${logArea} - ${getScriptSpawn.name}`, e);
    }
}

const getJavascriptSpawn = async (jsonConfig: string, plugin: Plugin, event: EventType, eventData: EventData): Promise<ChildProcessWithoutNullStreams> => {
    const pluginPath = getPluginExecPath(plugin.path, plugin.execFilePath);
    try {
        if (plugin.putDataInEnvironment) {
            return spawn(`node`, [pluginPath], buildEnvironmentVariables({ shell: true }, jsonConfig, event, eventData));
        } else {
            const args = systemUtil.flattenAndDistinct([pluginPath, await makeCommandParams(jsonConfig, plugin, event, eventData)]);
            return spawn(`node`, args, { shell: true });
        }
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, plugin.name, `${logArea} - ${getScriptSpawn.name}`, e);
    }
}

const prepareInputData = (data: any): string[] => {
    try {
        if (!data) return null;

        let dataString = data.toString();
        if (!dataString) return null;

        dataString = dataString.replace(/[\r\n]/, ``);

        const messageParts = dataString.split(`|*|`);
        if (messageParts.length == 2) return messageParts;
        return [`n/a`, dataString];
    } catch (e) {
        generalLogger.write(SeverityEnum.error, `${logArea} - ${prepareInputData.name}`, e);
    }
}

const executeLogic = async (plugin: Plugin, event: EventType, eventData: EventData, config: string): Promise<void> => {
    let spawned: ChildProcessWithoutNullStreams;
    try {
        switch (getCommandType(plugin.execFilePath)) {
            case `js`:
                spawned = await getJavascriptSpawn(config, plugin, event, eventData);
                break;
            case `cmd`:
            case `nixShell`:
            case `bat`:
                spawned = await getScriptSpawn(config, plugin, event, eventData);
                break;
            case `exe`:
            case `nixEx`:
                spawned = await getStandardSpawn(config, plugin, event, eventData);
                break;
        }

        spawned.on(`error`, (err) => {
            pluginLogger.write(SeverityEnum.error, plugin.name, `${logArea} - ${executeLogic.name}`, err.toString());
        });

        const pid = spawned.pid;
        pluginLogger.write(SeverityEnum.debug, plugin.name, `${logArea} - ${executeLogic.name}`, `starting child spawn with pid ${pid}`);
        spawned.on(`close`, code => {
            pluginLogger.write(SeverityEnum.debug, plugin.name, `${logArea} - ${executeLogic.name}`, `spawned child with pid ${pid} is closing. Code: ${code}`);
        });

        spawned.stdout.on(`data`, data => {
            const messageParts = prepareInputData(data);
            if (!messageParts) return;
            pluginLogger.write(SeverityEnum.pluginInfo, plugin.name, messageParts[0], messageParts[1]);
        });

        spawned.stderr.on(`data`, data => {
            const messageParts = prepareInputData(data);
            if (!messageParts) return;
            pluginLogger.write(SeverityEnum.pluginError, plugin.name, messageParts[0], messageParts[1]);
        });
    } catch (e) {
        // TODO: killing might be a bad idea here, keep an eye on this logic
        spawned.kill();
        pluginLogger.write(SeverityEnum.error, plugin.name, logArea, e);
    } finally {
        (spawned as any) = null;
    }
}

const shouldPluginExecute = (plugin: Plugin, configObj: any, event: EventType, eventData: EventData) => {
    try {
        if (!getPluginExecPath(plugin.path, plugin.execFilePath)) {
            pluginLogger.write(SeverityEnum.error, plugin.name, `${logArea} - ${shouldPluginExecute.name}`, `Skipping execution because plugin execution file (execFilePath) doesn't exist here: ${plugin.execFilePath}`);
            return false;
        }

        if (isPluginDisabled(configObj.enabled)) {
            pluginLogger.write(SeverityEnum.debug, plugin.name, `${logArea} - ${shouldPluginExecute.name}`, `Skipping execution because plugin is disabled`);
            return false;
        }

        if (isFilePathNotInWatchPaths(eventData.filePath, configObj.watchPaths)) {
            pluginLogger.write(SeverityEnum.debug, plugin.name, `${logArea} - ${shouldPluginExecute.name}`, `Skipping execution because filePath: ${eventData.filePath} is not in one of the watch paths: ${systemUtil.safeJoin(configObj.watchPaths)}`);
            return false;
        }

        if (isFilePathExcludedFromWatchPath(eventData.filePath, configObj.excludeWatchPaths)) {
            pluginLogger.write(SeverityEnum.debug, plugin.name, `${logArea} - ${shouldPluginExecute.name}`, `Skipping execution because filePath: ${eventData.filePath} is in exclude path: ${systemUtil.safeJoin(configObj.excludeWatchPaths)}`);
            return false;
        }

        if (shouldEventBeIgnored(event, plugin.eventTypes)) {
            pluginLogger.write(SeverityEnum.debug, plugin.name, `${logArea} - ${shouldPluginExecute.name}`, `Skipping execution because plugin is not listening to event: ${event}`);
            return false;
        }

        if (osUtil.shouldNotRunOnThisOs(plugin.runOnlyOnOsTypes)) {
            pluginLogger.write(SeverityEnum.debug, plugin.name, `${logArea} - ${shouldPluginExecute.name}`, `Skipping execution because OS is not of type ${systemUtil.safeJoin(plugin.runOnlyOnOsTypes)}`);
            return false;
        }

        return true;
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, plugin.name, `${logArea} - ${shouldPluginExecute.name}`, e);
    }
}

const execute = async (plugin: Plugin, event: EventType, eventData: EventData): Promise<void> => {
    try {
        if (!eventData) eventData = {dataType: "unknown", data: ``};

        let configObj = await pluginConfig.get(plugin.name);
        if (!configObj) configObj = JSON.parse(plugin.defaultConfig);

        if (!shouldPluginExecute(plugin, configObj, event, eventData)) return;
        if (configObj.runDelayInMinutes) await systemUtil.waitInMinutes(configObj.runDelayInMinutes);

        const beforeTime = performance.now();
        await executeLogic(plugin, event, eventData, JSON.stringify(configObj, null, 4));
        const afterTime = performance.now();
        pluginLogger.write(SeverityEnum.info, plugin.name, logArea, `Executed in ${(afterTime - beforeTime).toFixed(2)}ms`);
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, plugin.name, `${logArea} - ${execute.name}`, e);
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

const executeNow = async (plugin: Plugin, event: EventType, eventData: EventData): Promise<void> => execute(plugin, event, eventData);

const executeOnQueue = async (plugin: Plugin, event: EventType, eventData: EventData): Promise<void> => {
    try {
        if (!pluginQueues[plugin.name]) {
            const configObj = await generalConfig.get();
            pluginQueues[plugin.name] = queue({
                results: [],
                autostart: true,
                concurrency: configObj.eventQueuePluginExecutionConcurrency,
                timeout: configObj.eventQueuePluginExecutionTimeout,
            });
        }
        pluginQueues[plugin.name].push(() => execute(plugin, event, eventData));
    } catch (e) {
        delete pluginQueues[plugin.name];
        pluginLogger.write(SeverityEnum.error, plugin.name, `${logArea} - ${executeOnQueue.name}`, `Exception (${executeOnQueue.name}) - ${e}`);
    }
}

export {
    executeNow,
    executeOnQueue,
}