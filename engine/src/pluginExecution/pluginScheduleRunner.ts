import { spawn, Thread, Worker } from "threads";
import { performance } from 'perf_hooks';
import { fetchGanchosPlugins, fetchUserPlugins } from "./pluginsFinder";
import {
    implementsPluginBaseConfig, PluginBaseConfig, validationUtil, systemUtil, generalLogger, pluginLogger, SeverityEnum,
    pluginConfig, GanchosPluginArguments, EventType, PluginLogMessage, UserPlugin
} from 'ganchos-shared';

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

const runUserPluginAndReschedule = async (plugin: UserPlugin): Promise<void> => {
}

const runGanchosPluginAndReschedule = async (plugin: SchedulePlugin): Promise<void> => {
    try {
        const thread = await spawn(new Worker(plugin.workerPath));
        await thread.init();

        thread.getLogSubscription().subscribe((message: PluginLogMessage) => {
            pluginLogger.write(message.severity, plugin.name, message.areaInPlugin, message.message);
        });

        const config = await pluginConfig.get(plugin.name) || plugin.defaultConfigAsString
        if (!validationUtil.validateJson(config)) {
            await pluginLogger.write(SeverityEnum.error, plugin.name, logArea, "Invalid JSON in config file, or if that doesn't exist, then the default config for the plugin");
            await Thread.terminate(thread);
            return;
        }

        const args: GanchosPluginArguments = {
            filePath: 'n/a',
            jsonConfig: config,
            eventType: 'none',
        }
        const beforeTime = performance.now();
        await thread.run(args);
        const afterTime = performance.now();

        await pluginLogger.write(SeverityEnum.info, plugin.name, logArea, `Plugin executed in ${(afterTime - beforeTime).toFixed(2)}ms`);
        await Thread.terminate(thread);

        await pluginWaitAndRun(plugin, runGanchosPluginAndReschedule);
    } catch (e) {
        await pluginLogger.write(SeverityEnum.error, plugin.name, logArea, e);
    }
}

const getSchedulingEligibleGanchosPlugins = async (): Promise<SchedulePlugin[]> => {
    const plugins = [];
    for (const pluginName of await fetchGanchosPlugins(true)) {
        const thread = await spawn(new Worker(pluginFolder + pluginName));
        if (await thread.isEligibleForSchedule()) {
            const configAsString = await thread.getDefaultConfigJson();
            const config = validationUtil.validateJson(configAsString);
            if (!config) {
                await pluginLogger.write(SeverityEnum.error, pluginName, logArea, "Default JSON config is invalid...skipping plugin");
                continue;
            }
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
