import {
    GanchosExecutionArguments,
    EventType,
    pluginLogger,
    generalLogger,
    SeverityEnum,
    UserPlugin,
} from 'ganchos-shared';
import * as userPluginExecute from '../plugins/execution/userPlugin';
import { fetchGanchosPluginNames, fetchUserPlugins } from "../plugins/pluginsFinder";
import { executeOnQueue as executeGanchosPlugin } from '../plugins/execution/ganchosPlugin';

const logArea = "event dispatcher";

const runUserPlugin = async (event: string, eventData: string, plugin: UserPlugin): Promise<void> => {
    try {
        await userPluginExecute.executeOnQueue(plugin, event as EventType, eventData);
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, plugin.name, logArea, `Exception (${runUserPlugin.name}) - ${e}`);
    }
}

const runGanchosPlugin = async (event: string, eventData: string, pluginName: string): Promise<void> => {
    try {
        const GanchosExecutionArguments: GanchosExecutionArguments = {
            eventType: event as EventType,
            eventData: eventData,
            jsonConfig: null,
        };

        // TODO: Think through how eventData will work, should it be an object, a json string, what?
        // Could be a file for file system events, empty for schedule, old/new ip address for inetChange
        await executeGanchosPlugin(pluginName, GanchosExecutionArguments);
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Exception (${runGanchosPlugin.name}) - ${e}`);
    }
}

const dispatch = async (event: string, eventData: string): Promise<void> => {
    const tasks = [];

    generalLogger.write(SeverityEnum.debug, logArea, `${dispatch.name} - event: ${event}, filePath: ${eventData}`, true);

    for (const pluginName of await fetchGanchosPluginNames(true)) {
        tasks.push(runGanchosPlugin(event, eventData, pluginName));
    }

    for (const userPlugin of await fetchUserPlugins()) {
        tasks.push(runUserPlugin(event, eventData, userPlugin));
    }

    await Promise.all(tasks);
}

export {
    dispatch
}