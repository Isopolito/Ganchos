import chokidar from 'chokidar'
import { promises as fs } from 'fs'
import * as path from 'path'
import {
    fileUtil,
    validationUtil,
    generalLogger,
    SeverityEnum,
    generalConfig,
    Plugin,
    implementsPlugin,
    pluginConfig,
    systemUtil
} from 'ganchos-shared'

const logArea = `pluginFinder`;
let pluginWatcher: chokidar.FSWatcher;

const createPluginFromMetaFile = async (pluginPath: string): Promise<Plugin> => {
    const config = await generalConfig.get();

    if (!pluginPath.endsWith(config.pluginMetaExtension)) return null;

    const rawData = await fs.readFile(pluginPath);
    const plugin = validationUtil.parseAndValidateJson(rawData.toString(), true);

    if (!implementsPlugin(plugin)) {
        generalLogger.write(SeverityEnum.error, logArea, `The JSON in plugin meta file '${pluginPath}' is not a valid Plugin. Check that the required properties are present`);
        return null;
    }

    // This will ensure a plugin config exists and that it is in memory for comparisons later on
    await pluginConfig.getJson(plugin.name, plugin.defaultJsonConfig);

    plugin.path = path.dirname(pluginPath);
    return plugin;
}

const fetchPlugins = async (): Promise<Plugin[]> => {
    try {
        const config = await generalConfig.get();
        if (!config.pluginPaths) {
            generalLogger.write(SeverityEnum.debug, `${logArea} - ${fetchPlugins.name}`, `No pluginPaths found in general config`);
            return [];
        }
        generalLogger.write(SeverityEnum.debug, `${logArea} - ${fetchPlugins.name}`, `Plugin paths: ${systemUtil.safeJoin(config.pluginPaths)}`);

        const plugins = [];
        for (const filePath of await fileUtil.getAllFiles(config.pluginPaths, config.pluginMetaExtension)) {
            const plugin = await createPluginFromMetaFile(filePath);
            if (plugin) {
                plugins.push(plugin);
                generalLogger.write(SeverityEnum.debug, `${logArea} - ${fetchPlugins.name}`, `Found plugin: ${plugin.name}`);
            }
        }
        return plugins;
    } catch (e) {
        generalLogger.write(SeverityEnum.critical, `${logArea} - ${fetchPlugins.name}`, `Unable to fetch user plugins: ${e}`);
        return [];
    }
}

const watchPlugins = async (callback: (event: string, pluginFileName: string) => Promise<void>): Promise<void> => {
    if (pluginWatcher) return;

    const config = await generalConfig.get();
    if (!config.pluginPaths) return;

    pluginWatcher = chokidar.watch(fileUtil.interpolateHomeTilde(config.pluginPaths), {
        persistent: true,
        usePolling: false,
        ignoreInitial: true,
    });

    generalLogger.write(SeverityEnum.debug, logArea, `Watching the following plugin paths: ${systemUtil.safeJoin(config.pluginPaths)}`);

    pluginWatcher.on(`all`, (event: string, filePath: string) => callback(event, filePath));
    pluginWatcher.on(`error`, error => generalLogger.write(SeverityEnum.error, logArea, `Error in watcher: ${error}`));
}

const endWatchForPlugins = async (): Promise<void> => {
    if (pluginWatcher) {
        await pluginWatcher.close();
        (pluginWatcher as any) = null;
    }
}

export {
    watchPlugins,
    endWatchForPlugins,
    createPluginFromMetaFile,
    fetchPlugins,
}