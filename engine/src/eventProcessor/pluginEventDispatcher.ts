import { spawn, Thread, Worker } from "threads";
import { generalLogger, pluginLogger, SeverityEnum } from 'ganchas-shared';
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
    
        await pluginLogger.write(SeverityEnum.info, name, category, "pre-run", `About to run plugin`);
        const args: PluginArguments = {
            jsonConfig: 'FIXME',
            filePath,
            eventType: event as EventType,
        }
        await thread.run(args);
        await pluginLogger.write(SeverityEnum.info, name, category, "pre-run", `Ran plugin`);

        await Thread.terminate(thread);
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, "event processor", `Error running plugin '${name}' - ${e}`, true);
    }
}

const dispatch = async (event: string, filePath: string): Promise<void> => {
    for (let file in fetchNodePlugins()) {
        await runNodePlugin(event, filePath, file);
    }
}

export {
    dispatch
}