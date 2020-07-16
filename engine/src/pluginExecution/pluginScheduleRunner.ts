import { spawn, Thread, Worker } from "threads";
import { performance } from 'perf_hooks';
import { validationUtil, systemUtil, generalLogger, pluginLogger, SeverityEnum, pluginConfig, GanchosPluginArguments, EventType, PluginLogMessage } from 'ganchos-shared';
import { fetchGanchosPlugins } from "./pluginsFinder";

//======================================================================================================

interface SchedulePlugin {
    name: string;
    workerPath: string;
    defaultWaitTimeInMinutes: number;
    defaultConfigAsString: string;
}

const pluginFolder = "./pluginCollection/";
const logArea = "schedule runner";

//======================================================================================================

const pluginWaitAndRun = async (plugin: SchedulePlugin, run: (plugin: SchedulePlugin) => Promise<void>): Promise<void> => {
    const config = JSON.parse(await pluginConfig.get(plugin.name));
    const waitTimeInMinutes = (config && config.runPluginEveryXMinutes) || plugin.defaultWaitTimeInMinutes;
    
    // If a plugin runs and there is not config file for it (usually that will be the first time it runs), create the config file
    if (!config) pluginConfig.save(plugin.name, plugin.defaultConfigAsString, true);

    // Only take plugin 'enabled' into account if there is a user defined configuration already for that plugin
    if ((config.enabled || !config) && waitTimeInMinutes > 0) {
        await systemUtil.wait(waitTimeInMinutes * 60);
        await run(plugin);
    }
}

const runGanchosPluginAndReschedule = async (plugin: SchedulePlugin): Promise<void> => {
    let category = "n/a";
    try {
        const thread = await spawn(new Worker(plugin.workerPath));
        await thread.init();
        category = await thread.getCategory();
        const config = await pluginConfig.get(plugin.name);

        thread.getLogSubscription().subscribe((message: PluginLogMessage) => {
            pluginLogger.write(message.severity, plugin.name, category, message.areaInPlugin, message.message);
        });
 
        const args: GanchosPluginArguments = {
            filePath: 'n/a',
            jsonConfig: config || plugin.defaultConfigAsString,
            eventType: 'none',
        }
        const beforeTime = performance.now();
        await thread.run(args);
        const afterTime = performance.now();

        await pluginLogger.write(SeverityEnum.info, plugin.name, category, logArea,
            `Plugin executed in ${(afterTime - beforeTime).toFixed(2)}ms`);

        await Thread.terminate(thread);
        await pluginWaitAndRun(plugin, runGanchosPluginAndReschedule);
    } catch (e) {
        await pluginLogger.write(SeverityEnum.error, plugin.name, category, logArea, e);
    }
}

const getSchedulingEligibleGanchosPlugins = async (): Promise<SchedulePlugin[]> => {
    const plugins = [];
    for (const pluginName of await fetchGanchosPlugins(true)) {
        const thread = await spawn(new Worker(pluginFolder + pluginName));
        if (await thread.isEligibleForSchedule()) {
            const configAsString = await thread.getDefaultConfigJson();
            if (!validationUtil.isJsonStringValid(configAsString)) {
                const category = await thread.getCategory();
                await pluginLogger.write(SeverityEnum.error, pluginName, category, logArea, "Default JSON config is invalid...skipping plugin");
                continue;
            }
            const config = JSON.parse(configAsString);
            plugins.push({
                name: pluginName,
                workerPath: pluginFolder + pluginName,
                defaultWaitTimeInMinutes: config.runPluginEveryXMinutes || 0,
                defaultConfigAsString: configAsString,
            } as SchedulePlugin);
        }
        await Thread.terminate(thread);
    }
    return plugins;
}

const beginScheduleMonitoring = async (): Promise<void> => {
    try {
        const tasks = [];

        for (const plugin of await getSchedulingEligibleGanchosPlugins()) {
            tasks.push(runGanchosPluginAndReschedule(plugin));
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
