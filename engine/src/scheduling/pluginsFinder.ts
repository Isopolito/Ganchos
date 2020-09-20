import chokidar from 'chokidar';
import { promises as fs } from 'fs'
import * as path from 'path'
import { fileUtil, validationUtil, generalLogger, SeverityEnum, generalConfig, Plugin, implementsPlugin, pluginConfig } from 'ganchos-shared';

const logArea = "pluginFinder";
let PluginWatcher: chokidar.FSWatcher;

const createPluginFromMetaFile = async (pluginPath: string): Promise<Plugin> => {
    const config = await generalConfig.get();

    if (!pluginPath.endsWith(config.PluginMetaExtension)) return null;

    const rawData = await fs.readFile(pluginPath);
    const plugin = validationUtil.parseAndValidateJson(rawData.toString(), true);

    if (!implementsPlugin(plugin)) {
        generalLogger.write(SeverityEnum.error, logArea, `The JSON in plugin meta file '${pluginPath}' is not a valid Plugin`);
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
        if (!config.PluginPaths) return [];

        const plugins = [];
        for (const filePath of await fileUtil.getAllFiles(config.PluginPaths, config.PluginMetaExtension)) {
            const plugin = await createPluginFromMetaFile(filePath);
            if (plugin) plugins.push(plugin);
        }
        return plugins;
    } catch (e) {
        generalLogger.write(SeverityEnum.critical, logArea, `Unable to fetch user plugins: ${e}`);
        return [];
    }
}

const watchPlugins = async (callback: (event: string, pluginFileName: string) => void): Promise<void> => {
    if (PluginWatcher) return;

    const config = await generalConfig.get();
    if (!config.PluginPaths) return;

    PluginWatcher = chokidar.watch(config.PluginPaths, {
        persistent: true,
        usePolling: false,
        ignoreInitial: true,
    });

    PluginWatcher.on('all', async (event: string, filePath: string) => callback(event, filePath));
    PluginWatcher.on('error', async error => generalLogger.write(SeverityEnum.error, logArea, `Error in watcher: ${error}`));
}

const endWatchForPlugins = async (): Promise<void> => {
    if (PluginWatcher) {
        await PluginWatcher.close();
        (PluginWatcher as any) = null;
    }
}

export {
    watchPlugins,
    endWatchForPlugins,
    createPluginFromMetaFile,
    fetchPlugins,
}