import { pluginConfig, generalConfig, generalLogger, SeverityEnum } from 'ganchos-shared'
import * as pluginFinder from './scheduling/pluginsFinder';
import { beginScheduleMonitoring as beginPluginScheduler, scheduleSinglePlugin } from './scheduling/plugin';
import { stopIfNeededAndStart as stopStartFsEventListener, stop as stopFsEventListener } from './eventListening/fsEventListener'

const logArea = "main";

const refreshListenersIfWatchPathChanges = async (diffs: string[]|null): Promise<void> => {
    if (diffs && diffs.includes('watchPaths')) await stopStartFsEventListener();
}

const shutdown = async (): Promise<void> => {
    generalLogger.write(SeverityEnum.info, logArea, "Shutting down - end file watching", true);
    await pluginConfig.endWatch();
    await generalConfig.endWatch();
    await pluginFinder.endWatchForPlugins();

    generalLogger.write(SeverityEnum.info, logArea, "Shutting down - end file system event listener", true);
    await stopFsEventListener();

    generalLogger.write(SeverityEnum.info, logArea, "Goodbye", true);
}

const handleGeneralConfigChanges = async (diffs: string[] | null): Promise<void> => {
    if (diffs && diffs.includes('PluginPaths')) {
        // Make sure new user plugin paths are reflected in user plugin watcher
        await pluginFinder.endWatchForPlugins();
        await pluginFinder.watchPlugins((event, fileName) => scheduleSinglePlugin(fileName));
    }
}

(async () => {
    try {
        process.on('SIGINT', async () => await shutdown());
        process.on('SIGTERM', async () => await shutdown());
        process.on('SIGQUIT', async () => await shutdown());

        const tasks = [];

        generalLogger.write(SeverityEnum.info, logArea, "Started File System Event Listener", true);
        tasks.push(stopStartFsEventListener());

        generalLogger.write(SeverityEnum.info, logArea, "Begin plugin scheduler", true);
        tasks.push(beginPluginScheduler());

        generalLogger.write(SeverityEnum.info, logArea, "Watching general config files for changes", true);
        generalConfig.watch((event, filePath, diffs) => handleGeneralConfigChanges(diffs));

        generalLogger.write(SeverityEnum.info, logArea, "Watching user plugin config files for changes", true);
        tasks.push(pluginConfig.watch((event, filePath, diffs) => refreshListenersIfWatchPathChanges(diffs)));

        // If a plugin is deleted it will automatically be removed from scheduling
        generalLogger.write(SeverityEnum.info, logArea, "Monitoring user plugin paths for changes", true);
        tasks.push(pluginFinder.watchPlugins((event, fileName) => scheduleSinglePlugin(fileName)));

        await Promise.all(tasks);
    } catch (e) {
        generalLogger.write(SeverityEnum.error, logArea, `Exception, attempting graceful shutdown - ${e}`, true);
        await shutdown();
        process.exit(1);
    }
})();
