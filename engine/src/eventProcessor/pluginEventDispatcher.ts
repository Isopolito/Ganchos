import { spawn, Thread, Worker } from "threads";
import { performance } from 'perf_hooks';
import { validationUtil, generalLogger, pluginLogger, SeverityEnum, pluginConfig } from 'ganchos-shared';
import { fetchNodePlugins, PluginLogMessage, PluginArguments } from '../plugins';

const shouldPluginIgnoreEvent = (event: string, eventsToListenFor: EventType[]): boolean => {
    return !(eventsToListenFor && eventsToListenFor.includes(event as EventType));
}

const runNodePlugin = async (event: string, filePath: string, pluginName: string): Promise<void> => {
    let name = 'n/a';
    try {
        // TODO: Find a way to new up Worker where the path doesn't have to be hard coded
        const thread = await spawn(new Worker("../plugins/pluginCollection/" + pluginName));
        if (shouldPluginIgnoreEvent(event, await thread.getEventTypes())) return;

        await thread.init();
        name = await thread.getName();
        const category = await thread.getCategory();
 
        thread.getLogSubscription().subscribe((message: PluginLogMessage) => {
            pluginLogger.write(message.severity, name, category, message.areaInPlugin, message.message);
        });
    
        const jsonConfigString = await pluginConfig.get(name) || await thread.getDefaultConfigJson();
        if (!validationUtil.isJsonStringValid(jsonConfigString)) {
            await pluginLogger.write(SeverityEnum.error, name, category, "event processor",
                `Json configuration for plugin is invalid: ${jsonConfigString}`);
            return;
        }

        const args: PluginArguments = {
            filePath,
            jsonConfig: jsonConfigString,
            eventType: event as EventType,
        }

        const beforeTime = performance.now();
        await thread.run(args);
        const afterTime = performance.now();

        await Thread.terminate(thread);

        await pluginLogger.write(SeverityEnum.info, name, category, "run time",
            `Plugin executed in ${(afterTime - beforeTime).toFixed(2)}ms`);
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, "event processor", `Error running plugin '${name}' - ${e}`, true);
    }
}

const dispatch = async (event: string, filePath: string): Promise<void> => {
    for (let file of await fetchNodePlugins(true)) {
        await runNodePlugin(event, filePath, file);
    }
}

export {
    dispatch
}