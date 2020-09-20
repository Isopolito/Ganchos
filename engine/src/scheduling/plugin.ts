import * as path from 'path';
import { generalLogger, pluginLogger, SeverityEnum, pluginConfig, Plugin, systemUtil, fileUtil, generalConfig } from 'ganchos-shared';
import { fetchPlugins, createPluginFromMetaFile } from "./pluginsFinder";
import { executeNow as executePlugin } from '../pluginExecution';
import { PluginInstanceManager } from './PluginInstanceManager';

//======================================================================================================

const logArea = "schedule runner";
const badConfigWaitTimeInMin = 5;
const pluginInstanceManager = new PluginInstanceManager();

//======================================================================================================

const runPlugin = async (plugin: Plugin): Promise<any> => {
    const mostRecentConfig = await pluginConfig.getJson(plugin.name, JSON.stringify(plugin.defaultJsonConfig, null, 4));
    if (!mostRecentConfig) return null;

    await executePlugin(plugin, 'none', null);

    return JSON.parse(mostRecentConfig);
}

const runPluginAndReschedule = async (plugin: Plugin): Promise<void> => {
    try {
        if (!fileUtil.doesPathExist(path.join(plugin.path, plugin.binFileName))) {
            pluginLogger.write(SeverityEnum.warning, plugin.name, logArea, `Bin file for plugin doesn't exist. Removing plugin from schedule`);
            pluginInstanceManager.setRunningStatus(plugin.name, false);
            return;
        }

        if (pluginInstanceManager.isCanceled(plugin.name)) {
            await pluginInstanceManager.cancel(plugin.name);
            return;
        };

        pluginInstanceManager.setRunningStatus(plugin.name, true);
        const pluginConfigObj = await runPlugin(plugin);
        const generalConfigObj = await generalConfig.get();

        if (!pluginConfigObj || !pluginConfigObj.runEveryXMinutes || pluginConfigObj.runEveryXMinutes <= generalConfigObj.pluginScheduleIntervalFloorInMinutes) {
            pluginLogger.write(SeverityEnum.warning, plugin.name, logArea,
                `Either configuration for this plugin is missing or invalid, or the 'runEveryXMinutes' option has been set to < general config's pluginScheduleIntervalFloorInMinutes. Will try again in ${badConfigWaitTimeInMin} minutes`);
            await systemUtil.waitInMinutes(badConfigWaitTimeInMin);
        } else {
            await systemUtil.waitInMinutes(pluginConfigObj.runEveryXMinutes);
        }

        return runPluginAndReschedule(plugin);
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, plugin.name, logArea, `Exception (${runPluginAndReschedule.name}) - ${e}`);
    }
}

const beginScheduleMonitoring = async (): Promise<void> => {
    try {
        const tasks = [];

        const Plugins = (await fetchPlugins()).filter(up => up.isEligibleForSchedule)
        for (const plugin of Plugins) {
            tasks.push(runPluginAndReschedule(plugin));
        }

        await Promise.all(tasks);
    } catch (e) {
        generalLogger.write(SeverityEnum.critical, logArea, `Exception (${beginScheduleMonitoring.name}) - ${e}`, true);
    }
}

const scheduleSinglePlugin = async (pluginPath: string): Promise<void> => {
    const plugin = await createPluginFromMetaFile(pluginPath);
    if (!plugin || !plugin.isEligibleForSchedule) return;

    await pluginInstanceManager.setCanceledIfRunning(plugin.name, async () => await runPluginAndReschedule(plugin));
}

//======================================================================================================

export {
    beginScheduleMonitoring,
    scheduleSinglePlugin,
}
