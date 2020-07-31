import { spawn, Thread, Worker } from "threads";
import { performance } from 'perf_hooks';
import {
    osUtil, systemUtil, pluginLogger, SeverityEnum, GanchosExecutionArguments,
    PluginLogMessage, pluginConfig, shouldEventBeIgnored, validationUtil,
} from 'ganchos-shared';

const logArea = 'ganchos execution';

const getAndValidateDefaultConfig = async (pluginName: string): Promise<string> => {
    let thread;
    try {
        thread = await spawn(new Worker(`./pluginCollection/${pluginName}`));
        const config = await thread.getDefaultConfigJson();

        // Seems roundabout, but it's to validate json and strip out comments
        const configObj = validationUtil.parseAndValidatedJson(config, true);
        return JSON.stringify(configObj);
    } catch (e) {
        await pluginLogger.write(SeverityEnum.info, pluginName, logArea, `Exception - ${e}`);
    }
    finally {
        thread && await Thread.terminate(thread);
        thread = null;
    }
}

const execute = async (pluginName: string, args: GanchosExecutionArguments): Promise<any> => {
    let thread;
    try {
        thread = await spawn(new Worker(`./pluginCollection/${pluginName}`));
        const defaultConfig = await thread.getDefaultConfigJson();
        const config = await pluginConfig.getConfigJsonAndCreateConfigFileIfNeeded(pluginName, defaultConfig);
        if (!config) {
            await pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Json configuration for plugin is missing or invalid: ${defaultConfig}`);
            return;
        }
        args.jsonConfig = config;
        const configObj = JSON.parse(config);

        if (configObj.enabled !== undefined && configObj.enabled === false) return configObj;
        if (args.eventType && args.eventType !== 'none' && shouldEventBeIgnored(args.eventType, await thread.getEventTypes())) return configObj;
        if (typeof thread.getOsTypesToRunOn === 'function' && osUtil.shouldNotRunOnThisOs(await thread.getOsTypesToRunOn())) return configObj;

        if (configObj.runDelayInMinutes) await systemUtil.waitInMinutes(configObj.runDelayInMinutes);

        await thread.init();

        thread.getLogSubscription().subscribe((message: PluginLogMessage) => {
            pluginLogger.write(message.severity, pluginName, message.areaInPlugin, message.message);
        });

        const beforeTime = performance.now();
        await thread.run(args);
        const afterTime = performance.now();
        await pluginLogger.write(SeverityEnum.info, pluginName, logArea, `Executed in ${(afterTime - beforeTime).toFixed(2)}ms`);

        return configObj;
    } catch (e) {
        await pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Exception - ${e}`);
        return null;
    } finally {
        thread && await Thread.terminate(thread);
        thread = null;
    }
}

export {
    execute,
    getAndValidateDefaultConfig,
}