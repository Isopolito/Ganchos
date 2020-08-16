import queue from 'queue';
import * as path from 'path';
import chokidar from 'chokidar';
import * as shelljs from 'shelljs';
import * as differ from 'deep-diff';
import { promises as fsPromises } from 'fs';

import { getConfigPath, doesPathExist, touch, getAppBaseDir } from '../util/files';
import { generalLogger, SeverityEnum, validationUtil, systemUtil, fileUtil } from '../';
import { GeneralConfig, implementsGeneralConfig } from './GeneralConfig';

/*========================================================================================*/

// Cached for faster access (updated on get())
let cachedConfig: GeneralConfig;

// Config file from last save (updated on save())
// This is used to compare what's on disk to what's in memory
let configOnLastSave: GeneralConfig;

const logArea = "general config";
let watcher: chokidar.FSWatcher;
const saveQueue = queue({ results: [], concurrency: 1, autostart: true, timeout: 5000 });

/*========================================================================================*/

const isConfigInMemoryMostRecent = async (configPath: string): Promise<Boolean> => {
    if (!cachedConfig) return false;

    const stats = await fsPromises.stat(configPath);

    // True if inMemoryConfig was updated after the config file was last written to disk
    return stats.mtime.getTime() >= cachedConfig.lastUpdatedTimeStamp;
}

const getAndCreateDefaultIfNotExist = async (): Promise<GeneralConfig | null> => {
    const configPath = getConfigPath();
    if (doesPathExist(configPath)) return await get();

    const defaultConfig: GeneralConfig = {
        heartBeatPollIntervalInSeconds: 5,
        userPluginPaths: [path.join(getAppBaseDir(), 'plugins')],
        lastUpdatedTimeStamp: 0,
        userPluginMetaExtension: 'meta',
    };

    doesPathExist(configPath) || await touch(configPath);
    shelljs.test('-e', defaultConfig.userPluginPaths[0]) || shelljs.mkdir(defaultConfig.userPluginPaths[0]);

    await save(defaultConfig);
    return systemUtil.deepClone(defaultConfig);
}

const get = async (): Promise<GeneralConfig | null> => {
    const generalConfigFilePath = getConfigPath();
    try {
        if (!doesPathExist(generalConfigFilePath)) return null;
        if (await isConfigInMemoryMostRecent(generalConfigFilePath)) return cachedConfig;

        const configJson = (await fsPromises.readFile(generalConfigFilePath)).toString();
        const config = validationUtil.parseAndValidateJson(configJson);
        if (!implementsGeneralConfig(config)) {
            await generalLogger.write(SeverityEnum.critical, logArea, `The JSON in ${generalConfigFilePath} is not a valid GeneralConfig type`, true);
            return null;
        }

        // Only set this here initially, after that only on saves
        if (!configOnLastSave) configOnLastSave = config;

        cachedConfig = config;
        cachedConfig.lastUpdatedTimeStamp = Date.now();

        const clonedConfig = JSON.parse(configJson); // deep clone
        clonedConfig.userPluginPaths = fileUtil.interpolateHomeTilde(clonedConfig.userPluginPaths);
        return clonedConfig;
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, logArea, `Can't create GeneralConfig with JSON from file - ${generalConfigFilePath}: ${e}`, true);
        return null;
    }
}

const save = async (config: GeneralConfig) => {
    if (config === null) return;

    try {
        const configPath = getConfigPath();
        doesPathExist(configPath) || await touch(configPath);

        saveQueue.push(async () => {
            await fsPromises.writeFile(configPath, JSON.stringify(config, null, 4))

            const clonedConfig = systemUtil.deepClone(config);
            cachedConfig = clonedConfig;
            cachedConfig.lastUpdatedTimeStamp = Date.now();
            configOnLastSave = clonedConfig;
        });
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, `${logArea} - save`, `Exception - ${e}`, true);
    }
}

const watch = (callback : (eventName: string, configFile: string) => Promise<void>): void => {
    const configPath = getConfigPath();
    watcher = chokidar.watch(configPath, {
        persistent: true,
        usePolling: false,
        ignoreInitial: true,
    });

    watcher.on('all', async (event: string, filePath: string) => await callback(event, filePath));
    watcher.on('error', async error => await generalLogger.write(SeverityEnum.error, logArea, `Error in general config watcher: ${error}`));
}

const endWatch = async (): Promise<void> => {
    if (watcher) {
        await watcher.close();
        (watcher as any) = null;
    }
}

const diffBetweenFileAndMem = async (): Promise<string[]> => {
    if (!configOnLastSave) return [];

    const fromFile = await get();
    if (!fromFile) return [];

    const diffs = differ.diff(fromFile, configOnLastSave);
    if (!diffs) return [];

    const flatDiffs = diffs.reduce((paths: any[], diff) => {
        if (diff.path) paths = paths.concat(diff.path);
        return paths;
    }, []);

    // If config has been changed outside of ganchos, sync up changes
    if (flatDiffs.length > 1) configOnLastSave = fromFile;
    return flatDiffs;
}

/*========================================================================================*/

export {
    watch,
    endWatch,
    save,
    get,
    getAndCreateDefaultIfNotExist,
    diffBetweenFileAndMem 
};
