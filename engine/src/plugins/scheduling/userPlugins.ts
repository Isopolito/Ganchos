import * as path from 'path';
import { generalLogger, pluginLogger, SeverityEnum, pluginConfig, UserPlugin, systemUtil, fileUtil, generalConfig } from 'ganchos-shared';
import { fetchUserPlugins, createUserPluginFromMetaFile } from "../pluginsFinder";
import { executeNow as executeUserPlugin } from '../execution/userPlugin';
import { PluginInstanceManager } from './PluginInstanceManager';

//======================================================================================================

const logArea = "schedule runner";
const badConfigWaitTimeInMin = 5;
const pluginInstanceManager = new PluginInstanceManager();

//======================================================================================================

const runUserPlugin = async (plugin: UserPlugin): Promise<any> => {
    const mostRecentConfig = await pluginConfig.getJson(plugin.name, JSON.stringify(plugin.defaultJsonConfig));
    if (!mostRecentConfig) return null;

    await executeUserPlugin(plugin, 'none', null);

    return JSON.parse(mostRecentConfig);
}

const runUserPluginAndReschedule = async (plugin: UserPlugin): Promise<void> => {
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
        const pluginConfigObj = await runUserPlugin(plugin);
        const generalConfigObj = await generalConfig.get();

        if (!pluginConfigObj || !pluginConfigObj.runEveryXMinutes || pluginConfigObj.runEveryXMinutes <= generalConfigObj.pluginScheduleIntervalFloorInMinutes) {
            pluginLogger.write(SeverityEnum.warning, plugin.name, logArea,
                `Either configuration for this plugin is missing or invalid, or the 'runEveryXMinutes' option has been set to < general config's pluginScheduleIntervalFloorInMinutes. Will try again in ${badConfigWaitTimeInMin} minutes`);
            await systemUtil.waitInMinutes(badConfigWaitTimeInMin);
        } else {
            await systemUtil.waitInMinutes(pluginConfigObj.runEveryXMinutes);
        }

        return runUserPluginAndReschedule(plugin);
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, plugin.name, logArea, `Exception (${runUserPluginAndReschedule.name}) - ${e}`);
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
        generalLogger.write(SeverityEnum.critical, logArea, `Exception (${beginScheduleMonitoring.name}) - ${e}`, true);
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
