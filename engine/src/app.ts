import createCommandLineOptions from 'command-line-args'
import * as commandLineArgs from './commandLineArgs'
import { pluginConfig, generalConfig, generalLogger, SeverityEnum, EventType, fileUtil } from './shared'
import * as pluginFinder from './plugins/pluginsFinder'
import { beginScheduleMonitoring as beginPluginScheduler, scheduleSinglePlugin as scheduleSinglePluginIfNeeded } from './plugins/scheduling/plugin'
import { stopIfNeededAndStart as stopStartFsEventListener, stop as stopFsEventListener } from './eventListening/fsEventListener'
import { start as startInetWatch, stop as stopInetWatch } from './eventListening/inetListener'

// --------------------------------------------------------------------------------------------

const logArea = `main`;

const refreshListenersIfWatchPathChanges = async (diffs: string[]|null): Promise<void> => {
    if (diffs && diffs.includes('watchPaths')) await stopStartFsEventListener();
}

const processPluginChanges = async (event: EventType, filePath: string): Promise<void> => {
    if (!fileUtil.doesPathExist(filePath)) return;

    await pluginConfig.ensurePluginConfigExists(filePath);
    if (event === `add` || event === 'change') scheduleSinglePluginIfNeeded(filePath);
}

const shutdown = async (): Promise<void> => {
    generalLogger.write(SeverityEnum.info, logArea, `Shutting down - file watching`, true);
    await pluginConfig.endWatch();
    await generalConfig.endWatch();
    await pluginFinder.endWatchForPlugins();

    generalLogger.write(SeverityEnum.info, logArea, `Shutting down - file system event listener`, true);
    await stopFsEventListener();

    generalLogger.write(SeverityEnum.info, logArea, `Shutting down - inet watcher`, true);
    await stopInetWatch();

    generalLogger.write(SeverityEnum.info, logArea, `Goodbye`, true);
}

const handleGeneralConfigChanges = async (diffs: string[] | null): Promise<void> => {
    if (diffs && diffs.includes('pluginPaths')) {
        // Make sure new user plugin paths are reflected in user plugin watcher
        await pluginFinder.endWatchForPlugins();
        await pluginFinder.watchPlugins((event, fileName) => scheduleSinglePluginIfNeeded(fileName));
    }
}

// --------------------------------------------------------------------------------------------

(async () => {
    try {
        process.on('SIGINT', () => shutdown());
        process.on('SIGTERM', () => shutdown());
        process.on('SIGQUIT', () => shutdown());

        const commandLineOptions = createCommandLineOptions(commandLineArgs.availableCommandLineOptions);
        commandLineArgs.executeCommandLineArgumentHandlers(commandLineOptions);

        const tasks = [];

        generalLogger.write(SeverityEnum.info, logArea, `Started File System Event Listener`, true);
        tasks.push(stopStartFsEventListener());

        generalLogger.write(SeverityEnum.info, logArea, `Begin plugin scheduler`, true);
        tasks.push(beginPluginScheduler());

        generalLogger.write(SeverityEnum.info, logArea, `Watching general config files for changes`, true);
        generalConfig.watch((event, filePath, diffs) => handleGeneralConfigChanges(diffs));

        generalLogger.write(SeverityEnum.info, logArea, `Watching user plugin config files for changes`, true);
        tasks.push(pluginConfig.watch((event, filePath, diffs) => refreshListenersIfWatchPathChanges(diffs)));

        // If a plugin is deleted it will automatically be removed from scheduling
        generalLogger.write(SeverityEnum.info, logArea, `Monitoring user plugin paths for changes`, true);
        tasks.push(pluginFinder.watchPlugins((event: EventType, fileName) => processPluginChanges(event, fileName)));

        generalLogger.write(SeverityEnum.info, logArea, `Starting Inet watcher`, true);
        tasks.push(startInetWatch());

        await Promise.all(tasks);
    } catch (e) {
        generalLogger.write(SeverityEnum.error, logArea, `Exception, attempting graceful shutdown - ${e}`, true);
        await shutdown();
        process.exit(1);
    }
})();
