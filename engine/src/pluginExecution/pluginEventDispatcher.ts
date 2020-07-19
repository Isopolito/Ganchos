import { spawn, Thread, Worker } from "threads";
import { performance } from 'perf_hooks';
import { ObservablePromise } from "threads/dist/observable-promise";
import {
    PluginLogMessage, GanchosPluginArguments, EventType, validationUtil, generalLogger,
    pluginLogger, SeverityEnum, pluginConfig, UserPlugin, fileUtil, generalConfig
} from 'ganchos-shared';
import { fetchGanchosPluginNames, fetchUserPlugins } from "./pluginsFinder";

const logArea = "event processor";

const shouldPluginIgnoreEvent = (event: string, eventsToListenFor: EventType[]): boolean => {
    return !(eventsToListenFor && eventsToListenFor.includes(event as EventType));
}

const getJsonConfigString = async (pluginName: string, getDefaultJsonConfigFunc: () => ObservablePromise<string>): Promise<string> =>  {
    let configString = await pluginConfig.get(pluginName);
    const shouldWriteConfigToFileForFirstTime = !configString;
    if (!configString) configString = await getDefaultJsonConfigFunc();
    if (!validationUtil.validateJson(configString)) return null;
    if (shouldWriteConfigToFileForFirstTime) pluginConfig.save(pluginName, configString, true);

    return configString;
};

const runUserPlugin = async (event: string, filePath: string, plugin: UserPlugin): Promise<void> => {
}

const runGanchosPlugin = async (event: string, filePath: string, pluginName: string): Promise<void> => {
    let name = 'n/a';
    try {
        // TODO: Find a way to new up Worker where the path doesn't have to be hard coded
        const thread = await spawn(new Worker("./pluginCollection/" + pluginName));
        if (shouldPluginIgnoreEvent(event, await thread.getEventTypes())) return;

        await thread.init();
        name = await thread.getName();
 
        thread.getLogSubscription().subscribe((message: PluginLogMessage) => {
            pluginLogger.write(message.severity, name, message.areaInPlugin, message.message);
        });
    
        const jsonConfigString = await getJsonConfigString(name, thread.getDefaultConfigJson);
        if (!jsonConfigString) {
            await pluginLogger.write(SeverityEnum.error, name, logArea, `Json configuration for plugin is invalid: ${jsonConfigString}`);
            return;
        }

        const args: GanchosPluginArguments = {
            filePath,
            jsonConfig: jsonConfigString,
            eventType: event as EventType,
        }

        const beforeTime = performance.now();
        await thread.run(args);
        const afterTime = performance.now();

        await Thread.terminate(thread);

        await pluginLogger.write(SeverityEnum.info, name, logArea,
            `Plugin executed in ${(afterTime - beforeTime).toFixed(2)}ms`);
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, logArea, `Error running plugin '${name}' - ${e}`, true);
    }
}

const dispatch = async (event: string, filePath: string): Promise<void> => {
    const tasks = [];

    for (const file of await fetchGanchosPluginNames(true)) {
        tasks.push(runGanchosPlugin(event, filePath, file));
    }

    for (const userPlugin of await fetchUserPlugins()) {
        tasks.push(runUserPlugin(event, filePath, userPlugin));
    }

    await Promise.all(tasks);
}

export {
    dispatch
}