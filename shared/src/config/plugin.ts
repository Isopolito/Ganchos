import chokidar, { FSWatcher } from 'chokidar';
import * as differ from 'deep-diff';
import { promises as fsPromises } from 'fs';
import * as properLockFile from 'proper-lockfile';
import { generalLogger, SeverityEnum, pluginLogger } from '..';
import { parseAndValidatedJson } from '../util/validation';
import { getPluginConfigPath, doesPathExist, touch, removeExtension, getPluginConfigBasePath } from '../util/files';

/*========================================================================================*/

const logArea = "plugin config";
let pluginInMemory: { [key: string]: string } = {}

/*========================================================================================*/

const get = async (pluginName: string, shouldValidateJson?: boolean): Promise<string | null> => {
    pluginName = removeExtension(pluginName);
    const configPath = getPluginConfigPath(pluginName);
    if (!doesPathExist(configPath)) return null;

    try {
        const rawData = await fsPromises.readFile(configPath);
        const jsonString = rawData.toString();

        if (!shouldValidateJson || parseAndValidatedJson(jsonString)) {
            if (!pluginInMemory[pluginName]) pluginInMemory[pluginName] = jsonString;
            return jsonString;
        } else {
            await generalLogger.write(SeverityEnum.error, `${logArea} - get`, `Invalid json in plugin config file for '${pluginName}'`, true);
            return null;
        }
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, `${logArea} - get`, `Error. Can't parse plugin config json: ${e}`, true);
        return null;
    }
}

const save = async (pluginName: string, jsonConfig: string | null, shouldEnable?: boolean) => {
    if (!jsonConfig) {
        await generalLogger.write(SeverityEnum.error, `${logArea} - save`, `pluginName and jsonConfig required`, true);
        return null;
    }

    pluginInMemory[pluginName] = jsonConfig;

    try {
        pluginName = removeExtension(pluginName);
        const configPath = getPluginConfigPath(pluginName);
        doesPathExist(configPath) || await touch(configPath);

        if (shouldEnable) {
            const configObj = JSON.parse(jsonConfig);
            configObj.enabled = true;
            jsonConfig = JSON.stringify(configObj, null, 4);
        }

        const release = await properLockFile.lock(configPath, { retries: 5 });
        await fsPromises.writeFile(configPath, jsonConfig);
        release();
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, `${logArea} - save`, e, true);
    }
}

const getConfigJsonAndCreateConfigFileIfNeeded = async (pluginName: string, defaultJsonConfig: string): Promise<string | null> => {
    let config = await get(pluginName);
    const shouldCreateConfigFile = !config;
    if (shouldCreateConfigFile) config = defaultJsonConfig;

    if (!parseAndValidatedJson(config)) {
        await pluginLogger.write(SeverityEnum.error, pluginName, logArea, "Invalid JSON in config file, or if that doesn't exist, then the default config for the plugin...skipping plugin");
        return null;
    }

    if (shouldCreateConfigFile) await save(pluginName, config, true);
    return config;
}

let watcher: chokidar.FSWatcher;
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

const getFromMemory = (pluginName: string): string => pluginInMemory[pluginName];

const configSettingsDiffBetweenFileAndMem = async (pluginName: string): Promise<string[]> => {
    const inMemoryConfig = getFromMemory(pluginName);
    if (!inMemoryConfig) return [];

    const fromFile = await get(pluginName);
    if (!fromFile) return [];

    const diffs = differ.diff(JSON.parse(fromFile), JSON.parse(inMemoryConfig));
    if (!diffs) return [];

    return diffs.reduce((paths: any[], diff) => {
        if (diff.path) paths = paths.concat(diff.path);
        return paths;
    }, []);
}

/*========================================================================================*/

export {
    watch,
    endWatch,
    save,
    get,
    configSettingsDiffBetweenFileAndMem,
    getConfigJsonAndCreateConfigFileIfNeeded,
};
