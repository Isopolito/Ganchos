import * as path from 'path';
import { generalLogger, pluginLogger, SeverityEnum, pluginConfig, UserPlugin, systemUtil, fileUtil } from 'ganchos-shared';
import { fetchUserPlugins, createUserPluginFromMetaFile } from "../pluginsFinder";
import { execute as executeUserPlugin } from '../execution/userPlugin';
import { PluginInstanceManager } from './PluginInstanceManager';

//======================================================================================================

const logArea = "schedule runner";
const badConfigWaitTimeInMin = 5;
const pluginInstanceManager = new PluginInstanceManager();

//======================================================================================================

const runUserPlugin = async (plugin: UserPlugin): Promise<any> => {
    const mostRecentConfig = await pluginConfig.getConfigJsonAndCreateConfigFileIfNeeded(plugin.name, JSON.stringify(plugin.defaultJsonConfig));
    if (!mostRecentConfig) return null;

    const configObj = JSON.parse(mostRecentConfig);
    if (configObj.enabled) await executeUserPlugin(plugin, 'none', null);

    return configObj;
}

const runUserPluginAndReschedule = async (plugin: UserPlugin): Promise<void> => {
    try {
        if (!fileUtil.doesPathExist(path.join(plugin.path, plugin.binFileName))) {
            await pluginLogger.write(SeverityEnum.warning, plugin.name, logArea, `Bin file for plugin doesn't exist. Removing plugin from schedule`);
            pluginInstanceManager.setRunningStatus(plugin.name, false);
            return;
        }

        if (pluginInstanceManager.isCanceled(plugin.name)) {
            await pluginInstanceManager.cancel(plugin.name);
            return;
        };

        pluginInstanceManager.setRunningStatus(plugin.name, true);
        const pluginConfigObj = await runUserPlugin(plugin);

        if (!pluginConfigObj || !pluginConfigObj.runEveryXMinutes || pluginConfigObj.runEveryXMinutes <= 0) {
            await pluginLogger.write(SeverityEnum.warning, plugin.name, logArea,
                `Either configuration for this plugin is missing or invalid, or the 'runEveryXMinutes' option has been set to <= 0. Will try again in ${badConfigWaitTimeInMin} minutes`);
            await systemUtil.waitInMinutes(badConfigWaitTimeInMin);
        } else {
            await systemUtil.waitInMinutes(pluginConfigObj.runEveryXMinutes);
        }

        return runUserPluginAndReschedule(plugin);
    } catch (e) {
        await pluginLogger.write(SeverityEnum.error, plugin.name, logArea, `Exception (${runUserPluginAndReschedule.name}) - ${e}`);
    }
}

const beginScheduleMonitoring = async (): Promise<void> => {
    try {
        const tasks = [];

        const userPlugins = (await fetchUserPlugins()).filter(up => up.isEligibleForSchedule)
        for (const plugin of userPlugins) {
            tasks.push(runUserPluginAndReschedule(plugin));
        }

        await Promise.all(tasks);
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, logArea, `Exception (${beginScheduleMonitoring.name}) - ${e}`, true);
    }
}

const scheduleSingleUserPlugin = async (pluginPath: string): Promise<void> => {
    const plugin = await createUserPluginFromMetaFile(pluginPath);
    if (!plugin || !plugin.isEligibleForSchedule) return;

    await pluginInstanceManager.setCanceledIfRunning(plugin.name, async () => await runUserPluginAndReschedule(plugin));
}

//======================================================================================================

export {
    beginScheduleMonitoring,
    scheduleSingleUserPlugin,
}
