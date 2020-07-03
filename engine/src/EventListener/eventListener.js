import chokidar from 'chokidar';
import fsHooksGlobalLib from 'fshooks_globalLib';
import fsHooksBackendLib from 'fshooks_backendLib';
import * as uninitiatedPlugins from '../plugins';
import pathSyncEvents from '../constants/pathSyncEvents';
import pluginService from './pluginService';

// eslint-disable-next-line func-names
module.exports = (function () {
    const logConst = fsHooksGlobalLib.logConstants;
    const logger = fsHooksGlobalLib.logProxy(logConst.areas.engine);
    const configProxy = fsHooksGlobalLib.configProxy();
    const fileService = fsHooksBackendLib.fileService();
    const pluginNames = Object.keys(uninitiatedPlugins);
    const plugins = pluginNames.reduce((pluginMap, pluginName) => {
        pluginMap[pluginName] = uninitiatedPlugins[pluginName]();
        return pluginMap;
    }, {});

    // Set in watchPaths()
    let watcher;

    // Set in init()
    let config;
    let paths;

    // Monitor [pathsToWatch] for file system events and alert plugins when events occur
    const watchPaths = pathsToWatch => {
        try {
            const verifiedPaths = pathsToWatch.filter(p => {
                if (!fileService.isGoodPath(p)) {
                    logger.log(logConst.levels.error, `Path ${p} is not accessible`);
                    return false;
                }
                return true;
            });

            watcher = chokidar.watch(verifiedPaths, {
                ignored: /(^|[/\\])\../,
                persistent: true,
                usePolling: true,
            });

            // Add event listeners
            Object.values(pathSyncEvents).forEach(event => {
                if (event === pathSyncEvents.error) {
                    watcher.on(pathSyncEvents.error, error => logger.log(logConst.levels.error, `watcher error: ${error}`));
                } else {
                    watcher.on(event,
                        filePath => pluginService.alertPlugins(plugins, config, paths, logger, logConst, event, { filePath }));
                }
            });
        } catch (e) {
           logger.log(logConst.levels.error, `Error watching path(s): ${e}`);
        }
    };

    const init = async () => {
        if (!config && !paths) {
            try {
                // eslint-disable-next-line no-unreachable
                const responses = await Promise.all([
                    configProxy.get(),
                    configProxy.getPaths(),
                    configProxy.ensurePluginConfigsExist(plugins),
                ]);
                [config, paths] = responses;

                fileService.ensurePathExists(config.workPath);
                await pluginService.initPlugins(plugins, config, logger, logConst);
            } catch (e) {
                logger.log(logConst.levels.error, `Fatal Error initializing monitorService: ${e}`);
                process.exit(1);
            }
        }
    };

    const stop = () => watcher && watcher.close();

    // Watch app folder for system plugins only
    const run = () => {
        // This weirdness avoids the caller needing to be async aware
        (async () => {
            await init();
            watchPaths(config.paths.concat(paths.appFolder));
        })();
    };

    return {
        run,
        stop,
    };
}());
