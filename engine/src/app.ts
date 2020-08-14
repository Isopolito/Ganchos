import path from 'path';
import { pluginConfig, generalConfig, generalLogger, SeverityEnum, fileUtil } from 'ganchos-shared'
import * as pluginFinder from './plugins/pluginsFinder';
import { beginScheduleMonitoring as beginGanchosPluginScheduler, scheduleSingleGanchosPlugin } from './plugins/scheduled/ganchoPlugins';
import { beginScheduleMonitoring as beginUserPluginScheduler, scheduleSingleUserPlugin } from './plugins/scheduled/userPlugins';
import { stopIfNeededAndStart as stopStartFsEventListener, stop as stopFsEventListener } from './eventListeners/fsEventListener'

const logArea = "main";

const refreshListenersIfWatchPathChanges = async (pluginPath: string): Promise<void> => {
    const pluginName = path.basename(pluginPath);
    const diffs = await pluginConfig.diffBetweenFileAndMem(pluginName);
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

(async () => {
    try {
        fileUtil.clearWriteLocks();

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
        generalConfig.watch(async (event, configFilepath) => {
            const diffs = await generalConfig.diffBetweenFileAndMem();
            if (diffs && diffs.includes('userPluginPaths')) {
                // Make sure new user plugin paths are reflected in user plugin watcher
                await pluginFinder.endWatchForUserPlugins();
                await pluginFinder.watchUserPlugins((event, fileName) => scheduleSingleUserPlugin(fileName));
            }
        });

        await generalLogger.write(SeverityEnum.info, logArea, "Watching user plugin config files for changes", true);
        tasks.push(pluginConfig.watch((_, pluginPath) => refreshListenersIfWatchPathChanges(pluginPath)));

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
