import {
    GanchosExecutionArguments,
    EventType,
    pluginLogger,
    generalLogger,
    SeverityEnum,
    UserPlugin,
    pluginConfig,
    fileUtil
} from 'ganchos-shared';
import * as userPluginExecute from '../plugins/execution/userPlugin';
import { fetchGanchosPluginNames, fetchUserPlugins } from "../plugins/pluginsFinder";
import { execute as executeGanchosPlugin } from '../plugins/execution/ganchosPlugin';

const logArea = "event dispatcher";

const runUserPlugin = async (event: string, filePath: string, plugin: UserPlugin): Promise<void> => {
    try {
        // Don't run plugin if the file for the event is inside an excluded directory
        const config = await pluginConfig.get(plugin.name);
        if (fileUtil.isChildPathInParentPath(filePath, config.excludeWatchPaths)) return;

        await userPluginExecute.execute(plugin, event as EventType, filePath);
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, plugin.name, logArea, `Exception (${runUserPlugin.name}) - ${e}`);
    }
}

const runGanchosPlugin = async (event: string, filePath: string, pluginName: string): Promise<void> => {
    try {
        // Don't run plugin if the file for the event is inside an excluded directory
        const config = await pluginConfig.get(pluginName);
        if (fileUtil.isChildPathInParentPath(filePath, config.excludeWatchPaths)) return;

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

    await generalLogger.write(SeverityEnum.debug, logArea, `${dispatch.name} - event: ${event}, filePath: ${filePath}`, true);

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