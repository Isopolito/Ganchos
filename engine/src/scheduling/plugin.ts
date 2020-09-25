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

const doesConfigPreventScheduling = async (plugin: Plugin, pluginConfigObj) => {
    if (pluginConfigObj && pluginConfigObj.runEveryXMinutes === 0) return true;

    const generalConfigObj = await generalConfig.get();
    if (!pluginConfigObj || !pluginConfigObj.runEveryXMinutes
        || pluginConfigObj.runEveryXMinutes <= generalConfigObj.pluginScheduleIntervalFloorInMinutes)
    {
        pluginLogger.write(SeverityEnum.warning, plugin.name, logArea,
            `Either configuration for this plugin is missing or invalid, or the 'runEveryXMinutes' option has been set to < general config's pluginScheduleIntervalFloorInMinutes. Will try again in ${badConfigWaitTimeInMin} minutes`);

        return true;
    }

    return false;
}

const getPluginConfigOrDefault = async (plugin: Plugin): Promise<any> => {
    try {
        const mostRecentConfig = await pluginConfig.getJson(plugin.name, JSON.stringify(plugin.defaultJsonConfig));
        if (!mostRecentConfig) return null;

        return JSON.parse(mostRecentConfig);
    }
    catch (e) {
        pluginLogger.write(SeverityEnum.error, plugin.name, `${logArea} - ${getPluginConfigOrDefault.name}`, e);
    }
}

const runPluginAndReschedule = async (plugin: Plugin): Promise<void> => {
    try {
        if (!fileUtil.doesPathExist(path.join(plugin.path, plugin.execFilePath))) {
            pluginLogger.write(SeverityEnum.warning, plugin.name, logArea, `Execution file for plugin doesn't exist. Removing plugin from schedule`);
            pluginInstanceManager.setRunningStatus(plugin.name, false);
            return;
        }

        if (pluginInstanceManager.isCanceled(plugin.name)) {
            await pluginInstanceManager.cancel(plugin.name);
            return;
        };

        const pluginConfigObj = await getPluginConfigOrDefault(plugin);
        if (await doesConfigPreventScheduling(plugin, pluginConfigObj)) {
            await systemUtil.waitInMinutes(badConfigWaitTimeInMin);
        } else {
            pluginInstanceManager.setRunningStatus(plugin.name, true);
            await executePlugin(plugin, 'none', null);
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

        const plugins = (await fetchPlugins()).filter(up => up.isEligibleForSchedule)
        for (const plugin of plugins) {
            tasks.push(runPluginAndReschedule(plugin));
        }

        await Promise.all(tasks);
    } catch (e) {
        generalLogger.write(SeverityEnum.critical, logArea, `Exception (${beginScheduleMonitoring.name}) - ${e}`, true);
    }
}

const scheduleSinglePlugin = async (pluginPath: string): Promise<void> => {
    try {
        const plugin = await createPluginFromMetaFile(pluginPath);
        if (!plugin || !plugin.isEligibleForSchedule) return;

        generalLogger.write(SeverityEnum.debug, `${logArea} - ${scheduleSinglePlugin.name}`, `Scheduling: ${pluginPath}`);

        await pluginInstanceManager.setCanceledIfRunning(plugin.name, () => runPluginAndReschedule(plugin));
    } catch (e) {
        generalLogger.write(SeverityEnum.error, `${logArea} - ${scheduleSinglePlugin.name}`, e);
    }
}

//======================================================================================================

export {
    beginScheduleMonitoring,
    scheduleSinglePlugin,
}
