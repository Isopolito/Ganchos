import * as path from 'path';
import { spawn, Thread, Worker } from "threads";
import { generalLogger, pluginLogger, SeverityEnum, pluginConfig, UserPlugin, GanchosExecutionArguments, systemUtil, fileUtil } from 'ganchos-shared';
import { fetchGanchosPluginNames, fetchUserPlugins, createUserPluginFromMetaFile } from "./pluginsFinder";
import { execute as executeUserPlugin } from './userPluginExecution';
import { execute as executeGanchosPlugin } from './ganchosPluginExecution';

//======================================================================================================

const pluginFolder = "./pluginCollection/";
const logArea = "schedule runner";
const badConfigWaitTimeInMin = 5;

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
            return;
        }

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

const isGanchosPluginScheduable = async (pluginName: string, buildPath: boolean = true): Promise<boolean> => {
    let thread;
    try {
        const fullPath = buildPath ? path.join(pluginFolder, pluginName) : pluginName;
        if (!fileUtil.doesPathExist(fullPath)) {
            await pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Plugin path invalid: ${fullPath}`);
            return false;
        }

        thread = await spawn(new Worker(fullPath));
        return await thread.isEligibleForSchedule();
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, logArea, `Exception (${isGanchosPluginScheduable.name}) - ${e}`);
        return false;
    } finally {
        thread && await Thread.terminate(thread);
        thread = null;
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
        if (!configObj || !configObj.runEveryXMinutes || configObj.runEveryXMinutes <= 0) {
            await pluginLogger.write(SeverityEnum.warning, pluginName, logArea,
                `Either configuration for this plugin is missing or invalid, or the 'runEveryXMinutes' option has been set to <= 0. Will try again in ${badConfigWaitTimeInMin} minutes`);
            await systemUtil.waitInMinutes(badConfigWaitTimeInMin);
        } else {
            await systemUtil.waitInMinutes(configObj.runEveryXMinutes);
        }

        await runGanchosPluginAndReschedule(pluginName);
    } catch (e) {
        await pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Exception (${runGanchosPluginAndReschedule.name})- ${e}`);
    }
}

const getSchedulingEligibleGanchosPlugins = async (): Promise<string[]> => {
    const plugins: string[] = [];
    for (const pluginName of await fetchGanchosPluginNames(true)) {
        if (await isGanchosPluginScheduable(pluginName)) plugins.push(pluginName);
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
        await generalLogger.write(SeverityEnum.critical, logArea, `Exception (${beginScheduleMonitoring.name}) - ${e}`, true);
    }
}

const scheduleSingleUserPlugin = async (pluginPath: string): Promise<void> => {
    const plugin = await createUserPluginFromMetaFile(pluginPath);
    if (!plugin || !plugin.isEligibleForSchedule) return;

    return runUserPluginAndReschedule(plugin);
}

const scheduleSingleGanchosPlugin = async (pluginPath: string): Promise<void> => {
    if (!isGanchosPluginScheduable(pluginPath, false)) return;
    runGanchosPluginAndReschedule(path.basename(pluginPath));
}
//======================================================================================================

export {
    beginScheduleMonitoring,
    scheduleSingleUserPlugin,
    scheduleSingleGanchosPlugin,
}
