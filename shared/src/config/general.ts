import  fs from 'fs';
import chokidar from 'chokidar';
import { promises as fsPromises } from 'fs';
import * as properLockFile from 'proper-lockfile';
import * as path from 'path';
import * as shelljs from 'shelljs';

import { getConfigPath, doesPathExist, touch, getAppBaseDir } from '../util/files';
import { generalLogger, SeverityEnum, validationUtil } from '../';
import * as constants from '../constants/names';

/*========================================================================================*/

// Cached for faster access (updated on get())
let cachedConfig: GeneralConfig;

// Config file from last save (updated on save())
// This is used to compare what's on disk to what's in memory
let configOnLastSave: GeneralConfig;

const logArea = "general config";

/*========================================================================================*/

interface GeneralConfig {
    lastUpdatedTimeStamp: Number;
    userPluginPaths: string[];
    watchPaths: string[];
    heartBeatPollIntervalInSeconds: Number;
    userPluginMetaExtension: string;
}

const implementsGeneralConfig = (object: any): object is GeneralConfig => {
    if (!object) return false;

    const lastUpdatedTimeStamp = 'lastUpdatedTimeStamp' in object;
    const userPluginPaths = 'userPluginPaths' in object;
    const watchPaths = 'watchPaths' in object;
    const heartBeatPollIntervalInSeconds = 'heartBeatPollIntervalInSeconds' in object;
    const userPluginMetaExtension = 'userPluginMetaExtension' in object;

    return lastUpdatedTimeStamp && userPluginMetaExtension && watchPaths && userPluginPaths && heartBeatPollIntervalInSeconds;
}

const isConfigInMemoryMostRecent = async (configPath: string): Promise<Boolean> => {
    if (!cachedConfig) return false;

    const stats = await fsPromises.stat(configPath);

    // True if inMemoryConfig was updated after the config file was last written to disk
    return stats.mtime.getTime() <= cachedConfig.lastUpdatedTimeStamp;
}

const getAndCreateDefaultIfNotExist = async (): Promise<GeneralConfig | null> => {
    const configPath = getConfigPath();
    if (doesPathExist(configPath)) return await get();

    const defaultConfig: GeneralConfig = {
        heartBeatPollIntervalInSeconds: 5,
        watchPaths: [],
        userPluginPaths: [path.join(getAppBaseDir(), 'plugins')],
        lastUpdatedTimeStamp: 0,
        userPluginMetaExtension: 'meta',
    };

    shelljs.test('-e', defaultConfig.userPluginPaths[0]) || shelljs.mkdir(defaultConfig.userPluginPaths[0]);

    save(defaultConfig);
    return defaultConfig;
}

const get = async (): Promise<GeneralConfig | null> => {
    const generalConfigFilePath = getConfigPath();
    try {
        if (!doesPathExist(generalConfigFilePath)) return null;

        if (await isConfigInMemoryMostRecent(generalConfigFilePath)) return cachedConfig;

        const rawData = await fsPromises.readFile(generalConfigFilePath);
        const config = validationUtil.parseAndValidatedJson(rawData.toString());
        if (!implementsGeneralConfig(config)) {
            await generalLogger.write(SeverityEnum.critical, logArea, `The JSON in ${generalConfigFilePath} is not a valid GeneralConfig type`, true);
            return null;
        }

        cachedConfig = config;
        cachedConfig.lastUpdatedTimeStamp = Date.now();
        return config;
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

        const release = await properLockFile.lock(configPath, { retries: 5 });
        await fsPromises.writeFile(configPath, JSON.stringify(config, null, 4));
        release();

        cachedConfig = config;
        cachedConfig.lastUpdatedTimeStamp = Date.now();
        configOnLastSave = config;
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, `${logArea} - save`, `${e}`, true);
    }
}

let watcher: chokidar.FSWatcher;
const watch = async (callback : (eventName: string, configFile: string) => Promise<void>): Promise<void> => {
    const configPath = getConfigPath();
    watcher = chokidar.watch(configPath, {
        ignored: /(^|[/\\])\../,
        persistent: true,
        usePolling: false,
        ignoreInitial: true,
    });

    watcher.on('change', async (event: string, filePath: string) => await callback(event, filePath));
    watcher.on('error', async error => await generalLogger.write(SeverityEnum.error, logArea, `Error in watcher: ${error}`));
}

const endWatch = (): Promise<void> => watcher && watcher.close();

const getFromMemory = (): GeneralConfig => configOnLastSave;

/*========================================================================================*/

export {
    watch,
    endWatch,
    save,
    get,
    getFromMemory,
    implementsGeneralConfig,
    getAndCreateDefaultIfNotExist,
};
