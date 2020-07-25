import { spawn, Thread, Worker } from "threads";
import { generalLogger, pluginLogger, SeverityEnum, pluginConfig, UserPlugin, GanchosExecutionArguments, systemUtil } from 'ganchos-shared';
import { fetchGanchosPluginNames, fetchUserPlugins } from "./pluginsFinder";
import { execute as executeUserPlugin } from './userPluginExecution';
import { execute as executeGanchosPlugin } from './ganchosPluginExecution';

//======================================================================================================

const pluginFolder = "./pluginCollection/";
const logArea = "schedule runner";

//======================================================================================================

const runUserPluginAndReschedule = async (plugin: UserPlugin): Promise<void> => {
    try {
        const mostRecentConfig = await pluginConfig.getConfigJsonAndCreateConfigFileIfNeeded(plugin.name, JSON.stringify(plugin.defaultJsonConfig));
        if (!mostRecentConfig) return;

        const configObj = JSON.parse(mostRecentConfig);
        if (configObj.enabled) await executeUserPlugin(plugin, 'none', null);

        if (!configObj.runEveryXMinutes || configObj.runEveryXMinutes <= 0) {
            await pluginLogger.write(SeverityEnum.warning, plugin.name, logArea, "Either configuration for this plugin is missing or the 'runEveryXMinutes' option has been set to <= 0. Skipping...");
            return;
        }
        await systemUtil.waitInMinutes(configObj.runEveryXMinutes);
        
        runUserPluginAndReschedule(plugin);
    } catch (e) {
        await pluginLogger.write(SeverityEnum.error, plugin.name, logArea, `Exception - ${e}`);
    }
}

const runGanchosPluginAndReschedule = async (pluginName: string): Promise<void> => {
    try {
        const GanchosExecutionArguments: GanchosExecutionArguments = {
            eventType: 'none',
            filePath: 'n/a',
            jsonConfig: null,
        };

        const configObj = await executeGanchosPlugin(pluginName, GanchosExecutionArguments);
        if (!configObj.runEveryXMinutes || configObj.runEveryXMinutes <= 0) {
            await pluginLogger.write(SeverityEnum.warning, pluginName, logArea, "Either configuration for this plugin is missing or the 'runEveryXMinutes' option is missing or has been set to <= 0. Skipping...");
            return;
        }
        await systemUtil.waitInMinutes(configObj.runEveryXMinutes);

        await runGanchosPluginAndReschedule(pluginName);
    } catch (e) {
        await pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Exception - ${e}`);
    }
}

const getSchedulingEligibleGanchosPlugins = async (): Promise<string[]> => {
    const plugins = [] as string[];
    for (const pluginName of await fetchGanchosPluginNames(true)) {
        const thread = await spawn(new Worker(pluginFolder + pluginName));
        if (await thread.isEligibleForSchedule()) {
            plugins.push(pluginName);
        }
        await Thread.terminate(thread);
    }
    return plugins;
}

const beginScheduleMonitoring = async (): Promise<void> => {
    try {
        const tasks = [];

        for (const pluginName of await getSchedulingEligibleGanchosPlugins()) {
            tasks.push(runGanchosPluginAndReschedule(pluginName));
        }

        const userPlugins = (await fetchUserPlugins()).filter(up => up.isEligibleForSchedule)
        for (const plugin of userPlugins) {
            tasks.push(runUserPluginAndReschedule(plugin));
        }

        await Promise.all(tasks);
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, logArea, `Error scheduling plugins - ${e}`, true);
    }
}

//======================================================================================================

export {
    beginScheduleMonitoring,
}
