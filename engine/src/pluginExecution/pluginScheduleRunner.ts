import { spawn, Thread, Worker } from "threads";
import { performance } from 'perf_hooks';
import { systemUtil, generalLogger, pluginLogger, SeverityEnum, pluginConfig } from 'ganchos-shared';
import { fetchNodePlugins } from "./pluginsFinder";

//======================================================================================================

interface SchedulePlugin {
    name: string;
    workerPath: string;
    defaultWaitTime: number;
    defaultConfigAsString: string;
}

const pluginFolder = "./pluginCollection/";
const logArea = "schedule runner";

//======================================================================================================

const pluginWaitAndRun = async (plugin: SchedulePlugin, run: (plugin: SchedulePlugin) => Promise<void>): Promise<void> => {
    const config = JSON.parse(await pluginConfig.get(plugin.name));
    const waitTime = config.runPluginEveryXMinutes || plugin.defaultWaitTime;
    
    // If a plugin run and there is not config file for it, create it
    if (!config) pluginConfig.save(plugin.name, plugin.defaultConfigAsString);

    // Only take plugin 'enabled' into account if there is a user defined configuration already for that plugin
    if ((config.enabled || !config) && waitTime > 0) {
        await systemUtil.wait(waitTime)
        await run(plugin);
    }
}

const runNodePluginAndReschedule = async (plugin: SchedulePlugin): Promise<void> => {
    let category = "n/a";
    try {
        const thread = await spawn(new Worker(plugin.workerPath));
        category = await thread.getCategory();

        const beforeTime = performance.now();
        await thread.run();
        const afterTime = performance.now();

        await pluginLogger.write(SeverityEnum.info, name, category, logArea,
            `Plugin executed in ${(afterTime - beforeTime).toFixed(2)}ms`);

        await Thread.terminate(thread);
        await pluginWaitAndRun(plugin, runNodePluginAndReschedule);
    } catch (e) {
        await pluginLogger.write(SeverityEnum.error, plugin.name, category, logArea, e);
    }
}

const getSchedulingEligibleNodePlugins = async (): Promise<SchedulePlugin[]> => {
    const plugins = [];

    for (const pluginName of await fetchNodePlugins(true)) {
        const thread = await spawn(new Worker(pluginFolder + pluginName));
        if (await thread.isEligibleForSchedule()) {
            const configAsString = await thread.getDefaultConfigJson();
            const config = JSON.parse(configAsString);
            plugins.push({
                name: pluginName,
                workerPath: pluginFolder + pluginName,
                defaultWaitTime: config.runPluginEveryXMinutes || 0,
                configAsString: configAsString,
            });
        }
        await Thread.terminate(thread);
    }

    return plugins;
}

const beginScheduleMonitoring = async (): Promise<void> => {
    try {
        const tasks = [];

        for (const plugin of await getSchedulingEligibleNodePlugins()) {
            tasks.push(runNodePluginAndReschedule(plugin));
        }

        // Do above for user plugins

        await Promise.all(tasks);
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, logArea, `Error scheduling plugins - ${e}`, true);
    }
}

//======================================================================================================

export {
    beginScheduleMonitoring,
}
