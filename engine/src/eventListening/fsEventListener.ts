import chokidar from 'chokidar';
import { fileUtil, generalLogger, SeverityEnum, pluginConfig, systemUtil, EventType } from 'ganchos-shared';
import { dispatch } from './pluginEventDispatcher';
import { fetchPlugins } from '../scheduling/pluginsFinder';

/*========================================================================================*/

let watcher: chokidar.FSWatcher;
const logArea = "fs event listener";

/*========================================================================================*/

const getPluginWatchPathsFromConfig = async (pluginName: string, defaultJsonConfig: string): Promise<string[]> => {
    try {
        const config = await pluginConfig.getJson(pluginName, defaultJsonConfig);
        const configObj = JSON.parse(config);
        if (!configObj.watchPaths) return [];

        configObj.watchPaths = fileUtil.interpolateHomeTilde(configObj.watchPaths);
        return configObj.watchPaths.filter((wp: string) => isPathLegit(wp));
    } catch (e) {
        generalLogger.write(SeverityEnum.error, logArea, `Exception (${getPluginWatchPathsFromConfig.name}) - ${e}`);
    }
}

const processAllPluginsForWatchPaths = async (): Promise<string[]> => {
    const tasks = [];
    for (const Plugin of await fetchPlugins()) {
        tasks.push(getPluginWatchPathsFromConfig(Plugin.name, JSON.stringify(Plugin.defaultJsonConfig, null, 4)));
    }

    const results = await Promise.all(tasks);
    return systemUtil.flattenAndDistinct(results);
}

const isPathLegit = (path: string): boolean => {
    if (fileUtil.doesPathExist(path)) return true;

    generalLogger.write(SeverityEnum.error, logArea, `Watch Path '${path}' is not accessible...skipping`);
    return false;
}

const watchPaths = async (pathsToWatch: string[]): Promise<void> => {
    if (watcher) await stop();

    watcher = chokidar.watch(pathsToWatch, {
        ignored: /(^|[/\\])\../,
        persistent: true,
        usePolling: true,
        ignoreInitial: true,
    });

    watcher.on('all', async (event: string, filePath: string) => await dispatch(event as EventType, {filePath: filePath}));
    watcher.on('error', async error => generalLogger.write(SeverityEnum.error, logArea, `Error in watcher: ${error}`));
};

/*========================================================================================*/

const stop = async (): Promise<void> => {
    if (!watcher) return;

    await watcher.close();
    watcher = null;
}

const stopIfNeededAndStart = async (): Promise<void> => {
    try {
        const verifiedPaths = await processAllPluginsForWatchPaths();
        if (verifiedPaths.length) {
            generalLogger.write(SeverityEnum.info, logArea, `Watching paths: ${verifiedPaths.join(',')}`);
            await watchPaths(verifiedPaths);
        } 
    } catch (e) {
        generalLogger.write(SeverityEnum.error, logArea, `Exception (${stopIfNeededAndStart.name}) - ${e}`);
    }
}

/*========================================================================================*/

export {
    stopIfNeededAndStart,
    stop,
};
