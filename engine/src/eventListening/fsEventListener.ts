import chokidar from 'chokidar';
import { fileUtil, generalLogger, SeverityEnum, pluginConfig, systemUtil } from 'ganchos-shared';
import { dispatch } from './pluginEventDispatcher';
import { fetchUserPlugins, fetchGanchosPluginNames } from '../plugins/pluginsFinder';
import { getAndValidateDefaultConfig } from '../plugins/execution/ganchosPlugin';

/*========================================================================================*/

let watcher: chokidar.FSWatcher;
const logArea = "fs event listener";

/*========================================================================================*/

const getAndVerifyPluginWatchPaths = async (pluginName: string, defaultJsonConfig: string): Promise<string[]> => {
    try {
        const config = await pluginConfig.getJson(pluginName, defaultJsonConfig);
        const configObj = JSON.parse(config);
        if (!configObj.watchPaths) return [];

        configObj.watchPaths = fileUtil.interpolateHomeTilde(configObj.watchPaths);
        return configObj.watchPaths.filter((wp: string) => isPathLegit(wp));
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, logArea, `Exception (${getAndVerifyPluginWatchPaths.name}) - ${e}`);
    }
}

const processAllPluginsForWatchPaths = async (): Promise<string[]> => {
    const tasks = [];
    for (const userPlugin of await fetchUserPlugins()) {
        tasks.push(getAndVerifyPluginWatchPaths(userPlugin.name, JSON.stringify(userPlugin.defaultJsonConfig)));
    }

    for (const pluginName of await fetchGanchosPluginNames(true)) {
        const configString = await getAndValidateDefaultConfig(pluginName);
        if (configString) tasks.push(getAndVerifyPluginWatchPaths(pluginName, configString));
    }

    const results = await Promise.all(tasks);
    return systemUtil.flattenAndDistinct(results);
}

const isPathLegit = (path: string): boolean => {
    if (fileUtil.doesPathExist(path)) return true;

    generalLogger.writeSync(SeverityEnum.error, logArea, `Watch Path '${path}' is not accessible...skipping`);
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

    watcher.on('all', async (event: string, filePath: string) => await dispatch(event, filePath));
    watcher.on('error', async error => await generalLogger.write(SeverityEnum.error, logArea, `Error in watcher: ${error}`));
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
            await generalLogger.write(SeverityEnum.info, logArea, `Watching paths: ${verifiedPaths.join(',')}`);
            await watchPaths(verifiedPaths);
        } 
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, logArea, `Exception (${stopIfNeededAndStart.name}) - ${e}`);
    }
}

/*========================================================================================*/

export {
    stopIfNeededAndStart,
    stop,
};
