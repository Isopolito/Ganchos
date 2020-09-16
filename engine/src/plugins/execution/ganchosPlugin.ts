import queue from "queue";
import * as path from 'path';
import { performance } from 'perf_hooks';
import { spawn, Thread, Worker } from "threads";
import {
    osUtil, systemUtil, pluginLogger, SeverityEnum, GanchosExecutionArguments,
    PluginLogMessage, pluginConfig, shouldEventBeIgnored, validationUtil, fileUtil, generalConfig
} from 'ganchos-shared';

//------------------------------------------------------------------------------------------------
const logArea = 'ganchos execution';
const pluginQueues: { [pluginName: string]: queue } = {};
const pluginWorkerPaths: { [pluginName: string]: string } = {};

const isPathExcluded = (filePath: string|null, excludePaths: string[] | null): boolean => {
    return fileUtil.doesPathExist(filePath) && fileUtil.isDirectoryInPath(filePath, excludePaths);
}

const isPluginDisabled = (enabled: boolean | undefined): boolean => enabled !== undefined && enabled === false;

// Not using thread.js Pool because we need access to the Worker for the PID
const registerPluginOnQueueIfNeeded = async (pluginName: string, path: string): Promise<void> => {
    if (!pluginQueues[pluginName]) {
            const configObj = await generalConfig.get();
            pluginQueues[pluginName] = queue({
                results: [],
                autostart: true,
                concurrency: configObj.eventQueuePluginExecutionConcurrency,
                timeout: configObj.eventQueuePluginExecutionTimeout,
            });

        pluginWorkerPaths[pluginName] = path;
    }
}

const createThreadOnPool = async (pluginName: string, logic: (thread: any) => Promise<void>): Promise<boolean> => {
    if (!pluginQueues || !pluginQueues[pluginName]) {
        pluginLogger.write(SeverityEnum.error, pluginName, `${logArea} - ${createThreadOnPool.name}`,
            `Trying to use plugin queue before plugin has registered on queue (via ${registerPluginOnQueueIfNeeded.name}), skipping`);
        return false;
    }

    pluginQueues[pluginName].push(async () => {
        let worker: any, thread: any;
        try {
            worker = new Worker(pluginWorkerPaths[pluginName])
            thread = await spawn(worker);

            pluginLogger.write(SeverityEnum.debug, pluginName, `${logArea} - ${createThreadOnPool.name}`, `ganchos thread started with pid: ${worker.child.pid}`);
            await logic(thread);
        } catch (e) {
            pluginLogger.write(SeverityEnum.error, pluginName, `${logArea} - ${createThreadOnPool.name}`, `Exception - ${e}`);
        } finally {
            thread && await Thread.terminate(thread);
            pluginLogger.write(SeverityEnum.debug, pluginName, `${logArea} - ${createThreadOnPool.name}`, `terminated thread with pid: ${worker.child.pid}`);
            thread = null;
            worker = null;
        }
    });

    return true;
}

const getJsonConfigForPlugin = async (thread: any, pluginName: string): Promise<any> => {
    const defaultConfig = await thread.getDefaultConfigJson();
    const config = await pluginConfig.getJson(pluginName, defaultConfig);
    if (!config) {
        pluginLogger.write(SeverityEnum.error, pluginName, logArea, `JSON configuration for plugin is missing or invalid: ${defaultConfig}`);
        return null;
    }

    return config;
}

const runAndLogPerfMetrics = async (thread: any, pluginName: string, args: GanchosExecutionArguments) => {
    const beforeTime = performance.now();
    await thread.run(args);
    const afterTime = performance.now();
    pluginLogger.write(SeverityEnum.info, pluginName, logArea, `Executed in ${(afterTime - beforeTime).toFixed(2)}ms`);
}
//------------------------------------------------------------------------------------------------

const getAndValidateDefaultConfig = async (pluginName: string): Promise<string> => {
    let thread;
    try {
        const pluginPath = path.join('../', fileUtil.getGanchosPluginPath(), pluginName);
        thread = await spawn(new Worker(pluginPath));
        let defaultConfig = await thread.getDefaultConfigJson();

        const configObj = validationUtil.parseAndValidateJson(defaultConfig, true);
        if (!configObj) {
            pluginLogger.write(SeverityEnum.info, pluginName, logArea, `Default JSON configuration for plugin is invalid`);
            return null;
        }

        // Comments are not stripped out
        defaultConfig = JSON.stringify(configObj, null, 4);

        // Ensure plugin config exists (via default create logic) and is in memory for subsequent comparisons
        await pluginConfig.getJson(pluginName, defaultConfig);
        return defaultConfig;
    } catch (e) {
        pluginLogger.write(SeverityEnum.info, pluginName, logArea, `Exception (${getAndValidateDefaultConfig.name})- ${e}`);
    }
    finally {
        thread && await Thread.terminate(thread);
        thread = null;
    }
}

const isGanchosPluginEligibleForSchedule = async (pluginName: string): Promise<boolean> => {
    let thread;
    try {
        const filePath = path.join('../', fileUtil.getGanchosPluginPath(), pluginName);

        thread = await spawn(new Worker(filePath));
        return await thread.isEligibleForSchedule();
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Exception (${isGanchosPluginEligibleForSchedule.name}) - ${e}`);
        return false;
    } finally {
        thread && await Thread.terminate(thread);
        thread = null;
    }
}

const executeLogic = async (thread: any, pluginName: string, args: GanchosExecutionArguments): Promise<any> => {
    const jsonConfig = await getJsonConfigForPlugin(thread, pluginName)
    const configObj = JSON.parse(jsonConfig);

    // Check for any of the conditions that should cause the plugin to NOT be executed
    if (isPluginDisabled(configObj.enabled)) return configObj;
    if (args.eventType && args.eventType !== 'none' && shouldEventBeIgnored(args.eventType, await thread.getEventTypes())) return configObj;
    if (typeof thread.getOsTypesToRunOn === 'function' && osUtil.shouldNotRunOnThisOs(await thread.getOsTypesToRunOn())) return configObj;
    if (isPathExcluded(args.filePath, configObj.excludeWatchPaths)) return configObj;

    if (configObj.runDelayInMinutes) await systemUtil.waitInMinutes(configObj.runDelayInMinutes);

    await thread.init();

    thread.getLogSubscription().subscribe((message: PluginLogMessage) => {
        pluginLogger.write(message.severity, pluginName, message.areaInPlugin, message.message);
    });

    await runAndLogPerfMetrics(thread, pluginName, { ...args, jsonConfig });

    return configObj;
}

const executeNow = async (pluginName: string, args: GanchosExecutionArguments): Promise<any> => {
    let worker: any, thread: any;
    try {
        const pluginPath = path.join('../', fileUtil.getGanchosPluginPath(), pluginName);
        worker = new Worker(pluginPath);
        thread = await spawn(worker);
        pluginLogger.write(SeverityEnum.debug, pluginName, `${logArea} - ${executeNow.name}`, `ganchos thread started with pid: ${worker.child.pid}`);
        return await executeLogic(thread, pluginName, args);
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Exception (${executeNow.name}) - ${e}`);
    } finally {
        thread && await Thread.terminate(thread);
        pluginLogger.write(SeverityEnum.debug, pluginName, `${logArea} - ${createThreadOnPool.name}`, `terminated thread with pid: ${worker.child.pid}`);
        thread = null;
        worker = null;
    }
}

const executeOnQueue = async (pluginName: string, args: GanchosExecutionArguments): Promise<void> => {
    try {
        const pluginPath = path.join('../', fileUtil.getGanchosPluginPath(), pluginName);
        await registerPluginOnQueueIfNeeded(pluginName, pluginPath);
        await createThreadOnPool(pluginName, thread => executeLogic(thread, pluginName, args));
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Exception (${executeOnQueue.name}) - ${e}`);
    }
}

export {
    executeNow,
    executeOnQueue,
    getAndValidateDefaultConfig,
    isGanchosPluginEligibleForSchedule,
}