import * as path from 'path';

import { generalLogger, pluginLogger, SeverityEnum, GanchosExecutionArguments, systemUtil, generalConfig } from 'ganchos-shared';
import { fetchGanchosPluginNames } from "../pluginsFinder";
import { executeNow as executeGanchosPlugin, isGanchosPluginEligibleForSchedule } from '../execution/ganchosPlugin';
import { PluginInstanceManager } from './PluginInstanceManager';

//======================================================================================================

const logArea = "ganchos schedule runner";
const badConfigWaitTimeInMin = 5;
const pluginInstanceManager = new PluginInstanceManager();

//======================================================================================================

const runGanchosPluginAndReschedule = async (pluginName: string): Promise<void> => {
    try {
        const GanchosExecutionArguments: GanchosExecutionArguments = {
            eventType: 'none',
            filePath: 'n/a',
            jsonConfig: null,
        };

        const configObj = await executeGanchosPlugin(pluginName, GanchosExecutionArguments);
        const generalConfigObj = await generalConfig.get();

        if (!configObj || !configObj.runEveryXMinutes || configObj.runEveryXMinutes < generalConfigObj.pluginScheduleIntervalFloorInMinutes) {
            pluginLogger.write(SeverityEnum.warning, pluginName, logArea,
                `Either configuration for this plugin is missing or invalid, or the 'runEveryXMinutes' option has been set to < threshold as defined by pluginScheduleIntervalFloorInMinutes. Will try again in ${badConfigWaitTimeInMin} minutes`);
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
            generalLogger.write(SeverityEnum.debug, logArea , `(${beginScheduleMonitoring.name}) - found ganchos plugin: ${pluginName}`, true);
            tasks.push(runGanchosPluginAndReschedule(pluginName));
        }

        await Promise.all(tasks);
    } catch (e) {
        generalLogger.write(SeverityEnum.critical, logArea, `Exception (${beginScheduleMonitoring.name}) - ${e}`, true);
    }
}

const scheduleSingleGanchosPlugin = async (pluginPath: string): Promise<void> => {
    if (!await isGanchosPluginEligibleForSchedule(pluginPath)) return;

    const pluginName = path.basename(pluginPath);
    await pluginInstanceManager.setCanceledIfRunning(pluginName, async () => await runGanchosPluginAndReschedule(pluginName));
}

//======================================================================================================

export {
    beginScheduleMonitoring,
    scheduleSingleGanchosPlugin,
}
