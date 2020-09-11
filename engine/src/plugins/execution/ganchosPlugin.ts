import { spawn, Thread, Worker, Pool } from "threads";
import { performance } from 'perf_hooks';
import * as path from 'path';
import {
    osUtil, systemUtil, pluginLogger, SeverityEnum, GanchosExecutionArguments,
    PluginLogMessage, pluginConfig, shouldEventBeIgnored, validationUtil, fileUtil,
} from 'ganchos-shared';

//------------------------------------------------------------------------------------------------
const logArea = 'ganchos execution';
const pluginPool: { [pluginName: string]: Pool<any> } = {};
const registerWorkerOnPoolIfNeeded = (pluginName: string, path: string): void => {
    // TODO: Make number of workers/plugin configurable
    pluginPool[pluginName] = Pool(() => spawn(new Worker(path)), 4);
}
const createThreadOnPool = (pluginName: string, logic: (thread: any) => Promise<void>): boolean => {
    if (!pluginPool || !pluginPool[pluginName]) {
        pluginLogger.write(SeverityEnum.error, pluginName, `${logArea} - ${createThreadOnPool.name}`,
            `Trying to use thread pool before plugin has registered on thread pool (via ${registerWorkerOnPoolIfNeeded.name}), skipping`);

        return false;
    }

    pluginPool[pluginName].queue(logic);
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
        defaultConfig = JSON.stringify(configObj);

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

const execute = async (thread: any, pluginName: string, args: GanchosExecutionArguments): Promise<any> => {
    try {
        const jsonConfig = await getJsonConfigForPlugin(thread, pluginName)
        const configObj = JSON.parse(jsonConfig);

        if (configObj.enabled !== undefined && configObj.enabled === false) return configObj;
        if (args.eventType && args.eventType !== 'none' && shouldEventBeIgnored(args.eventType, await thread.getEventTypes())) return configObj;
        if (typeof thread.getOsTypesToRunOn === 'function' && osUtil.shouldNotRunOnThisOs(await thread.getOsTypesToRunOn())) return configObj;
        if (fileUtil.isChildPathInParentPath(args.filePath, configObj.excludeWatchPaths)) return configObj;

        if (configObj.runDelayInMinutes) await systemUtil.waitInMinutes(configObj.runDelayInMinutes);

        await thread.init();
        //pluginLogger.write(SeverityEnum.debug, pluginName, `${logArea} - ${execute.name}`, `ganchos thread started with pid: ${worker.child.pid}`);

        thread.getLogSubscription().subscribe((message: PluginLogMessage) => {
            pluginLogger.write(message.severity, pluginName, message.areaInPlugin, message.message);
        });

        args.jsonConfig = jsonConfig;
        await runAndLogPerfMetrics(thread, pluginName, args);

        return configObj;
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Exception (${execute.name}) - ${e}`);
        return null;
    } finally {
        //pluginLogger.write(SeverityEnum.debug, pluginName, `${logArea} - ${execute.name}`, `ending ganchos thread with pid: ${worker.child.pid}`);
        thread && await Thread.terminate(thread);
        thread = null;
    }
}

const executeNow = async (pluginName: string, args: GanchosExecutionArguments): Promise<any> => {
    try {
        const pluginPath = path.join('../', fileUtil.getGanchosPluginPath(), pluginName);
        const thread = await spawn(new Worker(pluginPath));
        return await execute(thread, pluginName, args);
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Exception (${executeNow.name}) - ${e}`);
    }
}

const executeOnQueue = (pluginName: string, args: GanchosExecutionArguments): void => {
    try {
        const pluginPath = path.join('../', fileUtil.getGanchosPluginPath(), pluginName);
        registerWorkerOnPoolIfNeeded(pluginName, pluginPath);
        createThreadOnPool(pluginName, thread => execute(thread, pluginName, args));
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