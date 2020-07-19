import { spawn, Thread, Worker } from "threads";
import { performance } from 'perf_hooks';
import { fetchGanchosPluginNames, fetchUserPlugins } from "./pluginsFinder";
import {
    validationUtil, systemUtil, generalLogger, pluginLogger, SeverityEnum,
    pluginConfig, GanchosPluginArguments, PluginLogMessage, UserPlugin
} from 'ganchos-shared';
import * as userPluginExecute from './userPluginExecution';

//======================================================================================================

interface GanchosScheduledPlugin {
    name: string;
    path: string;
    defaultJsonConfig: string;
}

const pluginFolder = "./pluginCollection/";
const logArea = "schedule runner";

//======================================================================================================

const pluginWait = async (pluginName: string, defaultWaitTimeInMinutes: number): Promise<void> => {
    // Attempt to grab the most recent plugin wait time from config file
    const config = JSON.parse(await pluginConfig.get(pluginName));
    const waitTimeInMinutes = (config && config.runPluginEveryXMinutes) || defaultWaitTimeInMinutes;

    // Only take plugin 'enabled' into account if there is a user defined configuration file already for that plugin
    if ((config && !config.enabled) || waitTimeInMinutes <= 0) return;

    await systemUtil.wait(waitTimeInMinutes * 60);
}

const getConfigJsonAndCreateConfigFileIfNeeded = async (pluginName: string, defaultJsonConfig: string): Promise<string> => {
    let config = await pluginConfig.get(pluginName);
    const shouldCreateConfigFile = !config;
    if (shouldCreateConfigFile) config = defaultJsonConfig;

    if (!validationUtil.validateJson(config)) {
        await pluginLogger.write(SeverityEnum.error, pluginName, logArea, "Invalid JSON in config file, or if that doesn't exist, then the default config for the plugin...skipping plugin");
        return null;
    }

    if (shouldCreateConfigFile) pluginConfig.save(pluginName, config, true);
    return config;
}

const runUserPluginAndReschedule = async (plugin: UserPlugin): Promise<void> => {
    try {
        await userPluginExecute.execute(plugin, 'none', null);

        const mostRecentConfig = await getConfigJsonAndCreateConfigFileIfNeeded(plugin.name, plugin.defaultJsonConfig);
        const configObj = JSON.parse(mostRecentConfig);
        await pluginWait(plugin.name, configObj.defaultWaitTimeInMinutes || 0);

        runUserPluginAndReschedule(plugin);
    } catch (e) {
        await pluginLogger.write(SeverityEnum.error, plugin.name, logArea, e);
    }
}

const runGanchosPluginAndReschedule = async (plugin: GanchosScheduledPlugin): Promise<void> => {
    try {
        const thread = await spawn(new Worker(plugin.path));
        await thread.init();

        thread.getLogSubscription().subscribe((message: PluginLogMessage) => {
            pluginLogger.write(message.severity, plugin.name, message.areaInPlugin, message.message);
        });

        const config = await getConfigJsonAndCreateConfigFileIfNeeded(plugin.name, plugin.defaultJsonConfig);
        if (!config) {
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

        const configObj = JSON.parse(config);
        await pluginWait(plugin.name, configObj.defaultWaitTimeInMinutes || 0);
        await runGanchosPluginAndReschedule(plugin);
    } catch (e) {
        await pluginLogger.write(SeverityEnum.error, plugin.name, logArea, e);
    }
}

const getSchedulingEligibleGanchosPlugins = async (): Promise<GanchosScheduledPlugin[]> => {
    const plugins = [];
    for (const pluginName of await fetchGanchosPluginNames(true)) {
        const thread = await spawn(new Worker(pluginFolder + pluginName));
        if (await thread.isEligibleForSchedule()) {
            const configAsString = await thread.getDefaultConfigJson();
            plugins.push({
                name: pluginName,
                path: pluginFolder + pluginName,
                defaultJsonConfig: configAsString,
            } as GanchosScheduledPlugin);
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
