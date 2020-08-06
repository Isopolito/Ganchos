import chokidar from 'chokidar';
import { promises as fs } from 'fs'
import * as appRoot from 'app-root-path'
import * as path from 'path'
import { fileUtil, validationUtil, generalLogger, SeverityEnum, generalConfig, UserPlugin, implementsUserPlugin, pluginConfig } from 'ganchos-shared';
import { debug } from 'console';

const logArea = "pluginFinder";
const ganchosPluginPath = '/src/pluginExecution/pluginCollection';
let ganchosWatcher: chokidar.FSWatcher;
let userPluginWatcher: chokidar.FSWatcher;

const fetchGanchosPluginNames = async (convertExtensionToJs?: boolean): Promise<string[]> => {
    try {
        const dirPath = path.join(`${appRoot}`, ganchosPluginPath);
        return (await fs.readdir(dirPath))
            .map(file => convertExtensionToJs ? file.replace(".ts", ".js") : file);
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, logArea, `Unable to fetch ganchos specific plugins: ${e}`);
        return [];
    }
}

const createUserPluginFromMetaFile = async (pluginPath: string): Promise<UserPlugin> => {
    const config = await generalConfig.getAndCreateDefaultIfNotExist();

    if (!pluginPath.endsWith(config.userPluginMetaExtension)) return null;

    const rawData = await fs.readFile(pluginPath);
    const plugin = validationUtil.parseAndValidatedJson(rawData.toString(), true);

    if (!implementsUserPlugin(plugin)) {
        await generalLogger.write(SeverityEnum.error, logArea, `The JSON in plugin meta file '${pluginPath}' is not a valid UserPlugin`);
        return null;
    }

    plugin.path = path.dirname(pluginPath);
    return plugin;
}

const fetchUserPlugins = async (): Promise<UserPlugin[]> => {
    try {
        const config = await generalConfig.getAndCreateDefaultIfNotExist();
        if (!config.userPluginPaths) return [];

        const plugins = [];
        for (const filePath of await fileUtil.getAllFiles(config.userPluginPaths, config.userPluginMetaExtension)) {
            const plugin = await createUserPluginFromMetaFile(filePath);
            if (plugin) plugins.push(plugin);
        }

        return plugins;
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, logArea, `Unable to fetch user plugins: ${e}`);
        return [];
    }
}

const watchGanchosPlugins = (callback: (event: string, pluginConfigObj: any) => void): void => {
    if (ganchosWatcher) return;

    const ganchosPluginFullPath = path.join(`${appRoot}`, ganchosPluginPath);
    ganchosWatcher = chokidar.watch(ganchosPluginFullPath, {
        //ignored: /(^|[/\\])\../,
        persistent: true,
        usePolling: false,
        ignoreInitial: true,
    });

    ganchosWatcher.on('all', async (event: string, filePath: string) => callback(event, filePath));
    ganchosWatcher.on('error', async error => await generalLogger.write(SeverityEnum.error, logArea, `Error in watcher: ${error}`));
}

const watchUserPlugins = async (callback: (event: string, pluginFileName: string) => void): Promise<void> => {
    if (userPluginWatcher) return;

    const config = await generalConfig.getAndCreateDefaultIfNotExist();
    if (!config.userPluginPaths) return;

    console.log(`watchUserPlugins - userPluginPath: ${config.userPluginPaths}`);

    userPluginWatcher = chokidar.watch(config.userPluginPaths, {
        //ignored: /(^|[/\\])\../,
        persistent: true,
        usePolling: false,
        ignoreInitial: true,
    });

    userPluginWatcher.on('all', async (event: string, filePath: string) => callback(event, filePath));
    userPluginWatcher.on('error', async error => await generalLogger.write(SeverityEnum.error, logArea, `Error in watcher: ${error}`));
}

const endWatchForGanchosPlugins = async (): Promise<void> => {
    if (ganchosWatcher) {
        await ganchosWatcher.close();
        (ganchosWatcher as any) = null;
    }
}

const endWatchForUserPlugins = async (): Promise<void> => {
    if (userPluginWatcher) {
        await userPluginWatcher.close();
        (userPluginWatcher as any) = null;
    }
}

export {
    watchGanchosPlugins,
    endWatchForGanchosPlugins,
    watchUserPlugins,
    endWatchForUserPlugins,
    fetchGanchosPluginNames,
    createUserPluginFromMetaFile,
    fetchUserPlugins,
}