import {
    EventType,
    pluginLogger,
    generalLogger,
    SeverityEnum,
    Plugin,
    EventData
} from 'ganchos-shared';
import * as PluginExecute from '../pluginExecution';
import { fetchPlugins } from "../scheduling/pluginsFinder";

const logArea = "event dispatcher";

const runPlugin = async (event: EventType, eventData: EventData, plugin: Plugin): Promise<void> => {
    try {
        await PluginExecute.executeOnQueue(plugin, event as EventType, eventData);
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, plugin.name, logArea, `Exception (${runPlugin.name}) - ${e}`);
    }
}

const dispatch = async (event: EventType, eventData: EventData): Promise<void> => {
    const tasks = [];

    generalLogger.write(SeverityEnum.debug, logArea, `${dispatch.name} - event: ${event}, filePath: ${eventData}`, true);

    for (const Plugin of await fetchPlugins()) {
        tasks.push(runPlugin(event, eventData, Plugin));
    }

    await Promise.all(tasks);
}

export {
    dispatch
}