import path from 'path';
import { pluginConfig, generalConfig, generalLogger, SeverityEnum } from 'ganchos-shared'
import { beginScheduleMonitoring } from './pluginExecution/pluginScheduleRunner';
import * as pluginFinder from './pluginExecution/pluginsFinder';
import { start as startFsEventListener, stop as stopFsEventListener } from './eventListeners/fsEventListener'

const logArea = "main";

const refreshListenersIfWatchPathChanges = async (pluginPath: string): Promise<void> => {
    const pluginName = path.basename(pluginPath);
    const diffs = await pluginConfig.configSettingsDiffBetweenFileAndMem(pluginName);
    if (diffs && diffs.includes('watchPaths')) {
        await stopFsEventListener();
        await startFsEventListener();
    }
}

const shutdown = async (): Promise<void> => {
    await stopFsEventListener();
    await pluginConfig.endWatch();
    await generalConfig.endWatch();
    await generalLogger.write(SeverityEnum.info, logArea, "SIGINT - Application is shutting down", true);
}

(async () => {
    try {
        process.on('SIGINT', async () => await shutdown());

        const tasks = [];

        await generalLogger.write(SeverityEnum.info, logArea, "Started File System Event Listener", true);
        tasks.push(startFsEventListener());

        await generalLogger.write(SeverityEnum.info, logArea, "Begin plugin runtime schedules", true);
        tasks.push(beginScheduleMonitoring());

        await generalLogger.write(SeverityEnum.info, logArea, "Watching general config files for changes", true);
        tasks.push(generalConfig.watch(async configObj => {
            // Call logic that will look for path changes in user plugins and add or remove plugins accordingly
        }));

        await generalLogger.write(SeverityEnum.info, logArea, "Watching user plugin config files for changes", true);
        tasks.push(pluginConfig.watch((_, pluginPath) => refreshListenersIfWatchPathChanges(pluginPath)));

        await generalLogger.write(SeverityEnum.info, logArea, "Monitoring ganchos plugin paths for changes", true);
        tasks.push(pluginFinder.watchGanchosPlugins(_ => {
            // Call logic that will monitor ganchos plugin path and schedule new ones, etc
        }));

        await generalLogger.write(SeverityEnum.info, logArea, "Monitoring user plugin paths for changes", true);
        tasks.push(pluginFinder.watchUserPlugins(_ => {
            // Call logic that will monitor users plugin path and schedule new ones, etc
        }));

        await Promise.all(tasks);
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, logArea, `Error from main: ${e}`, true);
        process.exit(1);
    }
})();



