import {
    EventType,
    pluginLogger,
    generalLogger,
    SeverityEnum,
    Plugin,
    EventData
} from 'ganchos-shared';
import * as pluginExecute from '../plugins/pluginExecution';
import { fetchPlugins } from "../plugins/pluginsFinder";

const logArea = "event dispatcher";

const runPlugin = async (event: EventType, eventData: EventData, plugin: Plugin): Promise<void> => {
    try {
        await pluginExecute.executeOnQueue(plugin, event as EventType, eventData);
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, plugin.name, logArea, `Exception (${runPlugin.name}) - ${e}`);
    }
}

const dispatch = async (event: EventType, eventData: EventData): Promise<void> => {
    const tasks = [];

    generalLogger.write(SeverityEnum.debug, logArea, `${dispatch.name} - event: ${event}, EventData: ${JSON.stringify(eventData)}`, true);

    for (const plugin of await fetchPlugins()) {
        tasks.push(runPlugin(event, eventData, plugin));
    }

    await Promise.all(tasks);
}

export {
    dispatch
}