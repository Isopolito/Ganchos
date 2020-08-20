import queue from 'queue';
import chokidar from 'chokidar';
import { promises as fsPromises } from 'fs';
import { generalLogger, SeverityEnum, pluginLogger } from '..';
import { parseAndValidateJson } from '../util/validation';
import { getPluginConfigPath, doesPathExist, touch, removeExtension, getPluginConfigBasePath } from '../util/files';

/*========================================================================================*/

const logArea = "plugin config";
let watcher: chokidar.FSWatcher;
const saveQueue = queue({ results: [], concurrency: 1, autostart: true, timeout: 5000 });

/*========================================================================================*/

const get = async (pluginName: string, shouldValidateJson?: boolean): Promise<string | null> => {
    pluginName = removeExtension(pluginName);
    const configPath = getPluginConfigPath(pluginName);
    if (!doesPathExist(configPath)) return null;

    try {
        const rawData = await fsPromises.readFile(configPath);
        const jsonString = rawData.toString();

        if (!shouldValidateJson || parseAndValidateJson(jsonString)) {
            intializeInMemoryPluginConfigIfNeededpluginName(pluginName, jsonString);
            return jsonString;
        } else {
            await generalLogger.write(SeverityEnum.error, `${logArea} - get`, `Invalid json in plugin config file for '${pluginName}'`);
            return null;
        }
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, `${logArea} - get`, `Error. Can't parse plugin config json: ${e}`);
        return null;
    }
}

const save = async (pluginName: string, jsonConfig: string | null, shouldEnable?: boolean): Promise<void | null> => {
    if (!jsonConfig) {
        await generalLogger.write(SeverityEnum.error, `${logArea} - save`, `pluginName and jsonConfig required`);
        return null;
    }

    setPluginConfigInMemory(pluginName, jsonConfig);

    try {
        pluginName = removeExtension(pluginName);
        const configPath = getPluginConfigPath(pluginName);
        doesPathExist(configPath) || await touch(configPath);

        if (shouldEnable) {
            const configObj = JSON.parse(jsonConfig);
            configObj.enabled = true;
            jsonConfig = JSON.stringify(configObj, null, 4);
        }

        saveQueue.push(() => fsPromises.writeFile(configPath, jsonConfig as string));
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, `${logArea} - ${save.name}`, `Exception - ${e}`);
    }
}

const getConfigJsonAndCreateConfigFileIfNeeded = async (pluginName: string, defaultJsonConfig: string): Promise<string | null> => {
    let config = null;
    try {
        config = await get(pluginName);
        const shouldCreateConfigFile = !config;
        if (shouldCreateConfigFile) config = defaultJsonConfig;

        if (!parseAndValidateJson(config)) {
            await pluginLogger.write(SeverityEnum.error, pluginName, logArea, "Invalid JSON in config file, or if that doesn't exist, then the default config for the plugin...skipping plugin");
            return null;
        }

        if (shouldCreateConfigFile) await save(pluginName, config, true);
    }
    catch (e) {
        await generalLogger.write(SeverityEnum.error, `${logArea} - ${getConfigJsonAndCreateConfigFileIfNeeded.name}`, `Exception - ${e}`);
    }
    finally {
        return config;
    }
}

const watch = async (callback: (eventName: string, pluginPath: string) => Promise<void>): Promise<void> => {
    if (watcher) return;

    const configPath = getPluginConfigBasePath();
    watcher = chokidar.watch(configPath, {
        //ignored: /(^|[/\\])\../,
        persistent: true,
        usePolling: false,
        ignoreInitial: true,
    });

    watcher.on('all', async (event: string, filePath: string) => await callback(event, filePath));
    watcher.on('error', async error => await generalLogger.write(SeverityEnum.error, logArea, `Error in watcher: ${error}`));
}

const endWatch = async (): Promise<void> => {
    if (watcher) {
        await watcher.close();
        (watcher as any) = null;
    }
}

/*========================================================================================*/

export {
    watch,
    endWatch,
    save,
    get,
    getConfigJsonAndCreateConfigFileIfNeeded,
};