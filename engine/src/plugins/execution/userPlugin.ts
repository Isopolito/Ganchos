import path from "path"
import queue from "queue";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { performance } from 'perf_hooks';
import {
    UserPlugin, pluginConfig, EventType, pluginLogger, fileUtil,
    SeverityEnum, systemUtil, osUtil, shouldEventBeIgnored, generalConfig
} from "ganchos-shared"

type CommandType = 'cmd' | 'bat' | 'nixShell' | 'exe' | 'nixEx';

const logArea = "userPluginExecute";
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

const makeCommandParams = async (jsonConfig: string, userPlugin: UserPlugin, event: string, eventData: string): Promise<string[]> => {
    const config = jsonConfig || userPlugin.defaultJsonConfig;
    return [`"${config}"`, `"${event}"`, `"${eventData}"`];
}

const getStandardSpawn = async (jsonConfig: string, userPlugin: UserPlugin, event: string, eventData: string): Promise<ChildProcessWithoutNullStreams> => {
    return spawn(`"${path.join(userPlugin.path, userPlugin.binFileName)}"`, await makeCommandParams(jsonConfig, userPlugin, event, eventData));
}

const getScriptSpawn = async (jsonConfig: string, userPlugin: UserPlugin, event: EventType, eventData: string): Promise<ChildProcessWithoutNullStreams> => {
    return spawn(`"${path.join(userPlugin.path, userPlugin.binFileName)}"`, await makeCommandParams(jsonConfig, userPlugin, event, eventData), { shell: true });
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

const executeNoTimer = async (userPlugin: UserPlugin, event: EventType, eventData: string, config: string): Promise<void> => {
    let spawned: ChildProcessWithoutNullStreams;
    try {
        switch (getCommandType(userPlugin.binFileName)) {
            case 'cmd':
            case 'nixShell':
            case 'bat':
                spawned = await getScriptSpawn(config, userPlugin, event, eventData);
                break;
            case 'exe':
            case 'nixEx':
                spawned = await getStandardSpawn(config, userPlugin, event, eventData);
                break;
        }

        const pid = spawned.pid;
        pluginLogger.write(SeverityEnum.debug, userPlugin.name, `logArea - ${executeNoTimer.name}`, `starting child spawn with pid ${pid}`);
        spawned.on('close', code => {
            pluginLogger.write(SeverityEnum.debug, userPlugin.name, `logArea - ${executeNoTimer.name}`, `spawned child with pid ${pid} is closing. Code: ${code}`);
        });

        spawned.stdout.on('data', data => {
            const messageParts = prepareInputData(data);
            if (!messageParts) return;
            pluginLogger.write(SeverityEnum.info, userPlugin.name, messageParts[0], messageParts[1]);
        });

        spawned.stderr.on('data', data => {
            const messageParts = prepareInputData(data);
            if (!messageParts) return;
            pluginLogger.write(SeverityEnum.info, userPlugin.name, messageParts[0], messageParts[1]);
        });
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, userPlugin.name, logArea, e);
    } finally {
        (spawned as any) = null;
    }
}

// NOTE: eventData depends on the context. For instance, if this is called from file listening it would be a file path
const execute = async (userPlugin: UserPlugin, event: EventType, eventData: string): Promise<void> => {
    let configObj = await pluginConfig.get(userPlugin.name);
    if (!configObj) configObj = JSON.parse(userPlugin.defaultJsonConfig);

    // Check for conditions that result in the plugin NOT being executed
    if (isPluginDisabled(configObj.enabled)) return;
    if (isPathExcluded(eventData, configObj.excludeWatchPaths)) return;
    if (shouldEventBeIgnored(event, userPlugin.eventTypes)) return;
    if (osUtil.shouldNotRunOnThisOs(userPlugin.runOnlyOnOsTypes)) return;

    if (configObj.runDelayInMinutes) await systemUtil.waitInMinutes(configObj.runDelayInMinutes);

    const beforeTime = performance.now();
    await executeNoTimer(userPlugin, event, eventData, JSON.stringify(configObj, null, 4));
    const afterTime = performance.now();
    pluginLogger.write(SeverityEnum.info, userPlugin.name, logArea, `Executed in ${(afterTime - beforeTime).toFixed(2)}ms`);
}

const executeNow = async (userPlugin: UserPlugin, event: EventType, eventData: string): Promise<void> => {
    return execute(userPlugin, event, eventData);
}

const executeOnQueue = async (userPlugin: UserPlugin, event: EventType, eventData: string): Promise<void> => {
    try {
        if (!pluginQueues[userPlugin.name]) {
            const configObj = await generalConfig.get();
            pluginQueues[userPlugin.name] = queue({
                results: [],
                autostart: true,
                concurrency: configObj.eventQueuePluginExecutionConcurrency,
                timeout: configObj.eventQueuePluginExecutionTimeout,
            });
        }
        pluginQueues[userPlugin.name].push(() => execute(userPlugin, event, eventData));
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, userPlugin.name, logArea, `Exception (${executeOnQueue.name}) - ${e}`);
    }
}

export {
    executeNow,
    executeOnQueue,
}