import path from "path"
import queue from "queue";
import { performance } from 'perf_hooks';
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import {
    Plugin, pluginConfig, EventType, EventData, pluginLogger, fileUtil,
    SeverityEnum, systemUtil, osUtil, shouldEventBeIgnored, generalConfig
} from "ganchos-shared"

type CommandType = 'cmd' | 'bat' | 'nixShell' | 'exe' | 'nixEx';

const logArea = "PluginExecute";
const pluginQueues: { [pluginName: string]: queue } = {};

const isPathExcluded = (filePath: string|null, excludePaths: string[] | null): boolean => {
    return fileUtil.doesPathExist(filePath) && fileUtil.isDirectoryInPath(filePath, excludePaths);
}

const isPluginDisabled = (enabled: boolean | undefined): boolean => enabled !== undefined && enabled === false;

const getCommandType = (binFileName: string): CommandType => {
    if (binFileName.endsWith('.cmd')) return 'cmd';
    if (binFileName.endsWith('.bat')) return 'bat';
    if (binFileName.endsWith('.exe')) return 'exe';
    if (binFileName.match(/.(sh|zsh|tcsh)$/)) return 'nixShell';

    return 'nixEx';
}

const buildEnvironmentVariables = (startingObject: {}, jsonConfig: string, event: EventType, eventData: EventData): object => {
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
}

const makeCommandParams = async (jsonConfig: string, plugin: Plugin, event: string, eventData: EventData): Promise<string[]> => {
    const config = jsonConfig || plugin.defaultJsonConfig;
    return [`"${config}"`, `"${event}"`, `"${eventData}"`];
}

const getStandardSpawn = async (jsonConfig: string, plugin: Plugin, event: EventType, eventData: EventData): Promise<ChildProcessWithoutNullStreams> => {
    return plugin.putDataInEnvironment
        ? spawn(`"${path.join(plugin.path, plugin.binFileName)}"`, [], buildEnvironmentVariables({}, jsonConfig, event, eventData))
        : spawn(`"${path.join(plugin.path, plugin.binFileName)}"`, await makeCommandParams(jsonConfig, plugin, event, eventData));
}

const getScriptSpawn = async (jsonConfig: string, plugin: Plugin, event: EventType, eventData: EventData): Promise<ChildProcessWithoutNullStreams> => {
    return plugin.putDataInEnvironment
        ? spawn(`"${path.join(plugin.path, plugin.binFileName)}"`, [], buildEnvironmentVariables({shell: true}, jsonConfig, event, eventData))
        : spawn(`"${path.join(plugin.path, plugin.binFileName)}"`, await makeCommandParams(jsonConfig, plugin, event, eventData));
}

const prepareInputData = (data: any): string[] => {
    if (!data) return null;

    let dataString = data.toString();
    if (!dataString) return null;

    dataString = dataString.replace(/[\r\n]/, "");

    const messageParts = dataString.split('|*|');
    if (messageParts.length == 2) return messageParts;
    return ['n/a', dataString];
}

const executeLogic = async (Plugin: Plugin, event: EventType, eventData: EventData, config: string): Promise<void> => {
    let spawned: ChildProcessWithoutNullStreams;
    try {
        switch (getCommandType(Plugin.binFileName)) {
            case 'cmd':
            case 'nixShell':
            case 'bat':
                spawned = await getScriptSpawn(config, Plugin, event, eventData);
                break;
            case 'exe':
            case 'nixEx':
                spawned = await getStandardSpawn(config, Plugin, event, eventData);
                break;
        }

        const pid = spawned.pid;
        pluginLogger.write(SeverityEnum.debug, Plugin.name, `logArea - ${executeLogic.name}`, `starting child spawn with pid ${pid}`);
        spawned.on('close', code => {
            pluginLogger.write(SeverityEnum.debug, Plugin.name, `logArea - ${executeLogic.name}`, `spawned child with pid ${pid} is closing. Code: ${code}`);
        });

        spawned.stdout.on('data', data => {
            const messageParts = prepareInputData(data);
            if (!messageParts) return;
            pluginLogger.write(SeverityEnum.info, Plugin.name, messageParts[0], messageParts[1]);
        });

        spawned.stderr.on('data', data => {
            const messageParts = prepareInputData(data);
            if (!messageParts) return;
            pluginLogger.write(SeverityEnum.info, Plugin.name, messageParts[0], messageParts[1]);
        });
    } catch (e) {
        // TODO: killing might be a bad idea here, keep an eye on this logic
        spawned.kill();
        pluginLogger.write(SeverityEnum.error, Plugin.name, logArea, e);
    } finally {
        (spawned as any) = null;
    }
}

const shouldPluginExecute = (plugin: Plugin, configObj: any, event: EventType, eventData: EventData) => {
    if (isPluginDisabled(configObj.enabled)) {
        pluginLogger.write(SeverityEnum.debug, plugin.name, `${logArea} - ${shouldPluginExecute}`, `Skipping execution because plugin is disabled`);
        return false;
    }

    if (isPathExcluded(eventData.filePath, configObj.excludeWatchPaths)) {
        pluginLogger.write(SeverityEnum.debug, plugin.name, `${logArea} - ${shouldPluginExecute}`, `Skipping execution because filePath: ${eventData.filePath} is in exclude path: ${systemUtil.safeJoin(configObj.excludeWatchPaths)}`);
        return false;
    }

    if (shouldEventBeIgnored(event, plugin.eventTypes)) {
        pluginLogger.write(SeverityEnum.debug, plugin.name, `${logArea} - ${shouldPluginExecute}`, `Skipping execution because plugin is not listening to event: ${event}`);
        return false;
    }

    if (osUtil.shouldNotRunOnThisOs(plugin.runOnlyOnOsTypes)) {
        pluginLogger.write(SeverityEnum.debug, plugin.name, `${logArea} - ${shouldPluginExecute}`, `Skipping execution because OS is not of type ${systemUtil.safeJoin(plugin.runOnlyOnOsTypes)}`);
        return false;
    }

    return true;
}

const execute = async (plugin: Plugin, event: EventType, eventData: EventData): Promise<void> => {
    let configObj = await pluginConfig.get(plugin.name);
    if (!configObj) configObj = JSON.parse(plugin.defaultJsonConfig);

    if (!shouldPluginExecute(plugin, configObj, event, eventData)) return;
    if (configObj.runDelayInMinutes) await systemUtil.waitInMinutes(configObj.runDelayInMinutes);

    const beforeTime = performance.now();
    await executeLogic(plugin, event, eventData, JSON.stringify(configObj, null, 4));
    const afterTime = performance.now();
    pluginLogger.write(SeverityEnum.info, plugin.name, logArea, `Executed in ${(afterTime - beforeTime).toFixed(2)}ms`);
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