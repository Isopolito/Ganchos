import chokidar from 'chokidar';
import { fileUtil, generalLogger, SeverityEnum, pluginConfig } from 'ganchos-shared';
import { dispatch } from '../pluginExecution/pluginEventDispatcher';
import { fetchUserPlugins, fetchGanchosPluginNames } from '../pluginExecution/pluginsFinder';
import { getAndValidateDefaultConfig } from '../pluginExecution/ganchosPluginExecution';

/*========================================================================================*/

let watcher: chokidar.FSWatcher;

/*========================================================================================*/

const getAndVerifyPluginWatchPaths = async (pluginName: string, defaultJsonConfig: string): Promise<string[]> => {
    const config = await pluginConfig.getConfigJsonAndCreateConfigFileIfNeeded(pluginName, defaultJsonConfig);
    const configObj = JSON.parse(config);
    if (!configObj.watchPaths) return [];
    return configObj.watchPaths.filter((wp: string) => isPathLegit(wp));
}

const processAllPluginsForWatchPaths = async (): Promise<string[]> => {
    const tasks = [];
    for (const userPlugin of await fetchUserPlugins()) {
        tasks.push(getAndVerifyPluginWatchPaths(userPlugin.name, JSON.stringify(userPlugin.defaultJsonConfig)));
    }

    for (const pluginName of await fetchGanchosPluginNames(true)) {
        const configString = await getAndValidateDefaultConfig(pluginName);
        tasks.push(getAndVerifyPluginWatchPaths(pluginName, configString));
    }

    const results = await Promise.all(tasks);
    return results.reduce((arr, val) => [...arr, ...val], []);
}

const isPathLegit = (path: string): boolean => {
    if (fileUtil.doesPathExist(path)) return true;

    generalLogger.writeSync(SeverityEnum.error, "event listener", `Watch Path '${path}' is not accessible...skipping`);
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
    watcher.on('error', async error => await generalLogger.write(SeverityEnum.error, "event listener", `Error in watcher: ${error}`));
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
        verifiedPaths.length && await watchPaths(verifiedPaths);
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, "event listener", `Error in 'run': ${e}`);
    }
}

/*========================================================================================*/

export {
    stopIfNeededAndStart,
    stop,
};
