import * as path from 'path';
import { spawn, Thread, Worker } from "threads";
import { generalLogger, pluginLogger, SeverityEnum, GanchosExecutionArguments, systemUtil, fileUtil } from 'ganchos-shared';
import { fetchGanchosPluginNames } from "../pluginsFinder";
import { execute as executeGanchosPlugin } from '../execution/ganchosPlugin';
import { PluginInstanceManager } from './PluginInstanceManager';

//======================================================================================================

const pluginFolder = "./pluginCollection/";
const logArea = "ganchos schedule runner";
const badConfigWaitTimeInMin = 5;
const pluginInstanceManager = new PluginInstanceManager();

//======================================================================================================

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

        if (pluginInstanceManager.isCanceled(pluginName)) {
            await pluginInstanceManager.cancel(pluginName);
            return;
        };

        pluginInstanceManager.setRunningStatus(pluginName, true);
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

        await Promise.all(tasks);
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, logArea, `Exception (${beginScheduleMonitoring.name}) - ${e}`, true);
    }
}

const scheduleSingleGanchosPlugin = async (pluginPath: string): Promise<void> => {
    if (!isGanchosPluginScheduable(pluginPath, false)) return;

    const pluginName = path.basename(pluginPath);
    await pluginInstanceManager.setCanceledIfRunning(pluginName, async () => await runGanchosPluginAndReschedule(pluginName));
}

//======================================================================================================

export {
    beginScheduleMonitoring,
    scheduleSingleGanchosPlugin,
}
