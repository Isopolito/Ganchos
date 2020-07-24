import { GanchosExecutionArguments, EventType, pluginLogger, SeverityEnum, UserPlugin } from 'ganchos-shared';
import { fetchGanchosPluginNames, fetchUserPlugins } from "./pluginsFinder";
import * as userPluginExecute from './userPluginExecution';
import { execute as executeGanchosPlugin } from './ganchosPluginExecution';

const logArea = "event dispatcher";

const runUserPlugin = async (event: string, filePath: string, plugin: UserPlugin): Promise<void> => {
    try {
        await userPluginExecute.execute(plugin, event as EventType, filePath);
    } catch (e) {
        await pluginLogger.write(SeverityEnum.error, plugin.name, logArea, e.toString());
    }
}

const runGanchosPlugin = async (event: string, filePath: string, pluginName: string): Promise<void> => {
    try {
        const GanchosExecutionArguments: GanchosExecutionArguments = {
            eventType: event as EventType,
            filePath: filePath,
            jsonConfig: null,
        };
        await executeGanchosPlugin(pluginName, GanchosExecutionArguments);
    } catch (e) {
        await pluginLogger.write(SeverityEnum.error, pluginName, logArea, e);
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