import { pluginConfig, generalConfig, generalLogger, SeverityEnum } from 'ganchos-shared'
import { beginScheduleMonitoring } from './pluginExecution/pluginScheduleRunner';
import * as pluginFinder from './pluginExecution/pluginsFinder';
import { run as runFsEventListener, stop as stopFsEventListener, updateWatchPaths } from './eventListeners/fsEventListener'

const logArea = "main";

(async () => {
    try {
        process.on('SIGINT', async () => {
            stopFsEventListener();
            await generalLogger.write(SeverityEnum.info, logArea, "SIGINT - Application is shutting down", true);
        });

        const tasks = [];

        await generalLogger.write(SeverityEnum.info, logArea, "Started File System Event Listener", true);
        tasks.push(runFsEventListener());

        await generalLogger.write(SeverityEnum.info, logArea, "Begin plugin runtime schedules", true);
        tasks.push(beginScheduleMonitoring());

        await generalLogger.write(SeverityEnum.info, logArea, "Watching general config files for changes", true);
        tasks.push(generalConfig.watch(async configObj => {
            // Call logic that will look for path changes in user plugins and add or remove plugins accordingly
        }));

        await generalLogger.write(SeverityEnum.info, logArea, "Watching user plugin config files for changes", true);
        tasks.push(pluginConfig.watch(async pluginConfigObj => {
            if (!pluginConfigObj) {
                await generalLogger.write(SeverityEnum.warning, logArea, "Detected bad user plugin config...skipping", true);
                return;
            }
            await updateWatchPaths(pluginConfigObj.watchPaths as string[]);
        }));

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