import { spawn, Thread, Worker } from "threads";
import { performance } from 'perf_hooks';
import { generalLogger, pluginLogger, SeverityEnum, pluginConfig } from 'ganchos-shared';
import { fetchNodePlugins, PluginLogMessage, PluginArguments } from '../plugins';

const shouldPluginIgnoreEvent = (event: string, eventsToListenFor: EventType[]): boolean => {
    return eventsToListenFor && eventsToListenFor.includes(event as EventType);
}

const runNodePlugin = async (event: string, filePath: string, pluginPath: string): Promise<void> => {
    try {
        const thread = await spawn(new Worker(pluginPath));
        if (shouldPluginIgnoreEvent(event, await thread.getEventTypes())) return;

        await thread.init();
        const name = await thread.getName();
        const category = await thread.getCategory();
 
        thread.getLogSubscription().subscribe(async (message: PluginLogMessage) => {
            await pluginLogger.write(message.severity, name, category, message.areaInPlugin, message.message);
        });
    
        const args: PluginArguments = {
            filePath,
            jsonConfig: await pluginConfig.get(name) || await thread.getDefaultConfigJson(),
            eventType: event as EventType,
        }

        const beforeTime = performance.now();
        await thread.run(args);
        const afterTime = performance.now();

        await pluginLogger.write(SeverityEnum.info, name, category, "run time",
            `Plugin executed in ${beforeTime - afterTime}ms`);

        await Thread.terminate(thread);
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, "event processor", `Error running plugin '${name}' - ${e}`, true);
    }
}

const dispatch = async (event: string, filePath: string): Promise<void> => {
    for (let file in await fetchNodePlugins()) {
        await runNodePlugin(event, filePath, file);
    }
}

export {
    dispatch
}