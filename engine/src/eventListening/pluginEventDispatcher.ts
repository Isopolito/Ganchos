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

const runUserPlugin = async (event: string, filePath: string, plugin: UserPlugin): Promise<void> => {
    try {
        await userPluginExecute.executeOnQueue(plugin, event as EventType, filePath);
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, plugin.name, logArea, `Exception (${runUserPlugin.name}) - ${e}`);
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
        pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Exception (${runGanchosPlugin.name}) - ${e}`);
    }
}

const dispatch = async (event: string, filePath: string): Promise<void> => {
    const tasks = [];

    generalLogger.write(SeverityEnum.debug, logArea, `${dispatch.name} - event: ${event}, filePath: ${filePath}`, true);

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