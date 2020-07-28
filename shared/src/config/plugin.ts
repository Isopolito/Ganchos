import fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as properLockFile from 'proper-lockfile';
import { generalLogger, SeverityEnum, pluginLogger } from '..';
import { parseAndValidatedJson } from '../util/validation';
import { getPluginConfigPath, doesPathExist, touch, removeExtension, getPluginConfigBasePath } from '../util/files';

/*========================================================================================*/

const logArea = "plugin config";
let pluginConfigFromLastSave: { [key: string]: string } = {}

/*========================================================================================*/

const get = async (pluginName: string, shouldValidateJson?: boolean): Promise<string | null> => {
    pluginName = removeExtension(pluginName);
    const configPath = getPluginConfigPath(pluginName);
    if (!doesPathExist(configPath)) return null;

    try {
        const rawData = await fsPromises.readFile(configPath);
        const jsonString = rawData.toString();
        if (!shouldValidateJson || parseAndValidatedJson(jsonString)) {
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

    pluginConfigFromLastSave[pluginName] = jsonConfig;

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

const watch = async (callback : (pluginConfigObj: any) => Promise<void>): Promise<void> => {
    const configPath = getPluginConfigBasePath();
    fs.watch(configPath, async (event, fileName) => {
        if (fileName) {
            const pluginJson = await get(fileName, true);
            await callback(pluginJson ? JSON.parse(pluginJson) : null);
        }
    });
}

const getFromMemory = (pluginName: string): string => pluginConfigFromLastSave[pluginName];

/*========================================================================================*/

export {
    watch,
    save,
    get,
    getFromMemory,
    getConfigJsonAndCreateConfigFileIfNeeded,
};
