import { spawn, Thread, Worker } from "threads";
import { performance } from 'perf_hooks';
import { osUtil, systemUtil, pluginLogger, SeverityEnum, GanchosExecutionArguments, PluginLogMessage, pluginConfig, EventType } from 'ganchos-shared';

const logArea = 'ganchos execution';

const shouldPluginIgnoreEvent = (event: string, eventsToListenFor: EventType[]): boolean => {
    return !(eventsToListenFor && eventsToListenFor.includes(event as EventType));
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

        if (args.eventType && args.eventType !== 'none' && shouldPluginIgnoreEvent(args.eventType, await thread.getEventTypes())) return configObj;
        if (typeof thread.getOsTypesToRunOn === 'function' && !osUtil.isThisRunningOnOs(await thread.getOsTypesToRunOn())) {
            return configObj;
        }

        await systemUtil.waitInMinutes(configObj.runDelayInMinutes || 0);

        thread.getLogSubscription().subscribe((message: PluginLogMessage) => {
            pluginLogger.write(message.severity, pluginName, message.areaInPlugin, message.message);
        });

        await thread.init();
        const beforeTime = performance.now();
        await thread.run(args);
        const afterTime = performance.now();
        await pluginLogger.write(SeverityEnum.info, pluginName, logArea, `Executed in ${(afterTime - beforeTime).toFixed(2)}ms`);

        return configObj;
    } catch (e) {
        await pluginLogger.write(SeverityEnum.error, pluginName, logArea, e);
        return null;
    } finally {
        await Thread.terminate(thread);
        thread = null;
    }
}

export {
    execute,
}