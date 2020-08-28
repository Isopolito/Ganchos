import * as path from 'path';
import { spawn, Thread, Worker } from "threads";
import { generalLogger, pluginLogger, SeverityEnum, GanchosExecutionArguments, systemUtil, fileUtil } from 'ganchos-shared';
import { fetchGanchosPluginNames } from "../pluginsFinder";
import { execute as executeGanchosPlugin } from '../execution/ganchosPlugin';
import { PluginInstanceManager } from './PluginInstanceManager';

//======================================================================================================

const logArea = "ganchos schedule runner";
const badConfigWaitTimeInMin = 5;
const pluginInstanceManager = new PluginInstanceManager();

//======================================================================================================

const isGanchosPluginEligibleForSchedule = async (pluginName: string): Promise<boolean> => {
    let thread;
    try {
        thread = await spawn(new Worker(path.join('../', fileUtil.getGanchosPluginPath(), pluginName)));
        return await thread.isEligibleForSchedule();
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, logArea, `Exception (${isGanchosPluginEligibleForSchedule.name}) - ${e}`);
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
            pluginLogger.write(SeverityEnum.warning, pluginName, logArea,
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
        pluginLogger.write(SeverityEnum.error, pluginName, logArea, `Exception (${runGanchosPluginAndReschedule.name})- ${e}`);
    }
}

const getSchedulingEligibleGanchosPlugins = async (): Promise<string[]> => {
    const plugins: string[] = [];
    for (const pluginName of await fetchGanchosPluginNames(true)) {
        if (await isGanchosPluginEligibleForSchedule(pluginName)) plugins.push(pluginName);
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
    if (!isGanchosPluginEligibleForSchedule(pluginPath)) return;

    const pluginName = path.basename(pluginPath);
    await pluginInstanceManager.setCanceledIfRunning(pluginName, async () => await runGanchosPluginAndReschedule(pluginName));
}

//======================================================================================================

export {
    beginScheduleMonitoring,
    scheduleSingleGanchosPlugin,
}
