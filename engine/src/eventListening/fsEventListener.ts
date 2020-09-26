import chokidar from 'chokidar'

import { fileUtil, generalLogger, SeverityEnum, pluginConfig, EventType } from 'ganchos-shared'
import { dispatch } from './pluginEventDispatcher'

/*========================================================================================*/

let watcher: chokidar.FSWatcher;
const logArea = "fs event listener";

/*========================================================================================*/

const watchPaths = async (pathsToWatch: string[]): Promise<void> => {
    if (watcher) await stop();

    watcher = chokidar.watch(fileUtil.interpolateHomeTilde(pathsToWatch), {
        ignored: /(^|[/\\])\../,
        persistent: true,
        usePolling: true,
        ignoreInitial: true,
    });

    watcher.on('all', async (event: string, filePath: string) => await dispatch(event as EventType, {filePath: filePath}));
    watcher.on('error', async error => generalLogger.write(SeverityEnum.error, logArea, `Error in watcher: ${error}`));
};

const isPathLegit = (path: string): boolean => {
    if (fileUtil.doesPathExist(path)) return true;

    generalLogger.write(SeverityEnum.error, logArea, `Watch Path '${path}' is not accessible...skipping`);
    return false;
}

const getVerifiedWatchPathsFromPluginConfig = (configs: any[]): string[] => {
    let allWatchPaths = [];
    for (const configObj of configs) {
        const watchPaths = fileUtil.interpolateHomeTilde(configObj.watchPaths) as string[];
        allWatchPaths = allWatchPaths.concat(watchPaths.filter((wp: string) => isPathLegit(wp)));
    }

    return allWatchPaths;
}

/*========================================================================================*/

const stop = async (): Promise<void> => {
    if (!watcher) return;

    await watcher.close();
    watcher = null;
}

const stopIfNeededAndStart = async (): Promise<void> => {
    try {
        const configObjects = await pluginConfig.getAllPluginConfigObjects();
        const verifiedPaths = getVerifiedWatchPathsFromPluginConfig(configObjects);
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
