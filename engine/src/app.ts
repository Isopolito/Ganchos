import { pluginConfig, generalConfig, generalLogger, SeverityEnum } from 'ganchos-shared'
import * as pluginFinder from './plugins/pluginsFinder';
import { beginScheduleMonitoring as beginGanchosPluginScheduler, scheduleSingleGanchosPlugin } from './plugins/scheduling/ganchosPlugins';
import { beginScheduleMonitoring as beginUserPluginScheduler, scheduleSingleUserPlugin } from './plugins/scheduling/userPlugins';
import { stopIfNeededAndStart as stopStartFsEventListener, stop as stopFsEventListener } from './eventListening/fsEventListener'

const logArea = "main";

const refreshListenersIfWatchPathChanges = async (diffs: string[]|null): Promise<void> => {
    if (diffs && diffs.includes('watchPaths')) await stopStartFsEventListener();
}

const shutdown = async (): Promise<void> => {
    await generalLogger.write(SeverityEnum.info, logArea, "Shutting down - end file watching", true);
    await pluginConfig.endWatch();
    await generalConfig.endWatch();
    await pluginFinder.endWatchForUserPlugins();
    await pluginFinder.endWatchForGanchosPlugins();

    await generalLogger.write(SeverityEnum.info, logArea, "Shutting down - end file system event listener", true);
    await stopFsEventListener();

    await generalLogger.write(SeverityEnum.info, logArea, "Goodbye", true);
}

const handleGeneralConfigChanges = async (diffs: string[] | null): Promise<void> => {
    if (diffs && diffs.includes('userPluginPaths')) {
        // Make sure new user plugin paths are reflected in user plugin watcher
        await pluginFinder.endWatchForUserPlugins();
        await pluginFinder.watchUserPlugins((event, fileName) => scheduleSingleUserPlugin(fileName));
    }
}

(async () => {
    try {
        process.on('SIGINT', async () => await shutdown());
        process.on('SIGTERM', async () => await shutdown());
        process.on('SIGQUIT', async () => await shutdown());

        const tasks = [];

        await generalLogger.write(SeverityEnum.info, logArea, "Started File System Event Listener", true);
        tasks.push(stopStartFsEventListener());

        await generalLogger.write(SeverityEnum.info, logArea, "Begin plugin scheduler", true);
        tasks.push(beginGanchosPluginScheduler());
        tasks.push(beginUserPluginScheduler());

        await generalLogger.write(SeverityEnum.info, logArea, "Watching general config files for changes", true);
        generalConfig.watch((event, filePath, diffs) => handleGeneralConfigChanges(diffs));

        await generalLogger.write(SeverityEnum.info, logArea, "Watching user plugin config files for changes", true);
        tasks.push(pluginConfig.watch((event, filePath, diffs) => refreshListenersIfWatchPathChanges(diffs)));

        // If a plugin is deleted it will automatically be removed from scheduling
        await generalLogger.write(SeverityEnum.info, logArea, "Monitoring ganchos plugin paths for changes", true);
        tasks.push(pluginFinder.watchGanchosPlugins((event, fileName) => scheduleSingleGanchosPlugin(fileName)));

        // If a plugin is deleted it will automatically be removed from scheduling
        await generalLogger.write(SeverityEnum.info, logArea, "Monitoring user plugin paths for changes", true);
        tasks.push(pluginFinder.watchUserPlugins((event, fileName) => scheduleSingleUserPlugin(fileName)));

        await Promise.all(tasks);
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, logArea, `Exception, attempting graceful shutdown - ${e}`, true);
        await shutdown();
        process.exit(1);
    }
})();
