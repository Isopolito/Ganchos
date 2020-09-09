import { spawn, Thread, Worker } from "threads";
import { performance } from 'perf_hooks';
import * as path from 'path';
import {
    osUtil, systemUtil, pluginLogger, SeverityEnum, GanchosExecutionArguments,
    PluginLogMessage, pluginConfig, shouldEventBeIgnored, validationUtil, fileUtil,
} from 'ganchos-shared';

const logArea = 'ganchos execution';

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

const execute = async (pluginName: string, args: GanchosExecutionArguments): Promise<any> => {
    let thread;
    let worker: any;
    try {
        const pluginPath = path.join('../', fileUtil.getGanchosPluginPath(), pluginName);
        worker = new Worker(pluginPath)
        thread = await spawn(worker);
        const defaultConfig = await thread.getDefaultConfigJson();
        const config = await pluginConfig.getJson(pluginName, defaultConfig);
        if (!config) {
            pluginLogger.write(SeverityEnum.error, pluginName, logArea, `JSON configuration for plugin is missing or invalid: ${defaultConfig}`);
            return;
        }
        args.jsonConfig = config;
        const configObj = JSON.parse(config);

        if (configObj.enabled !== undefined && configObj.enabled === false) return configObj;
        if (args.eventType && args.eventType !== 'none' && shouldEventBeIgnored(args.eventType, await thread.getEventTypes())) return configObj;
        if (typeof thread.getOsTypesToRunOn === 'function' && osUtil.shouldNotRunOnThisOs(await thread.getOsTypesToRunOn())) return configObj;
        if (fileUtil.isChildPathInParentPath(args.filePath, configObj.excludeWatchPaths)) return configObj;

        if (configObj.runDelayInMinutes) await systemUtil.waitInMinutes(configObj.runDelayInMinutes);

        await thread.init();
        pluginLogger.write(SeverityEnum.debug, pluginName, `${logArea} - ${execute.name}`, `ganchos thread started with pid: ${worker.child.pid}`);

        thread.getLogSubscription().subscribe((message: PluginLogMessage) => {
            pluginLogger.write(message.severity, pluginName, message.areaInPlugin, message.message);
        });

        const beforeTime = performance.now();
        await thread.run(args);
        const afterTime = performance.now();
        pluginLogger.write(SeverityEnum.info, pluginName, logArea, `Executed in ${(afterTime - beforeTime).toFixed(2)}ms`);

        return configObj;
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Exception (${execute.name}) - ${e}`);
        return null;
    } finally {
        pluginLogger.write(SeverityEnum.debug, pluginName, `${logArea} - ${execute.name}`, `ending ganchos thread with pid: ${worker.child.pid}`);
        thread && await Thread.terminate(thread);
        thread = null;
    }
}

export {
    execute,
    getAndValidateDefaultConfig,
}