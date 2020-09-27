import { promises as fsPromises } from 'fs';

import { doesPathExist, touch, makeAllDirInPath, getPluginConfigPath, removeExtension, getPluginConfigBasePath, getAllFiles } from '../util/files';
import { SeverityEnum, pluginLogger, validationUtil }  from '..';
import * as generalLogger from '../logging/generalLogger';
import { ConfigManager } from './ConfigManager';
import { Watcher } from './watcher';

/*========================================================================================*/

const logArea = "plugin config";

// Ensure plugin path always exists, and if necessary create default jsonConfig if available
const pluginConfigMgrInitializer = (pluginName: string, defaultConfig: string | null) => async (): Promise<void> => {
    const pluginPath = getPluginConfigPath(pluginName);
    if (!doesPathExist(pluginPath)) {
        touch(pluginPath);
        if (defaultConfig) await fsPromises.writeFile(pluginPath, defaultConfig);
    }
}
const inMemConfigManagers: { [pluginName: string]: ConfigManager } = {};

const watcher = new Watcher(
    getPluginConfigBasePath(),
    async (filePath) => {
        const pluginName = removeExtension(filePath);
        return inMemConfigManagers[pluginName]
            ? await inMemConfigManagers[pluginName].getFromMemory()
            : null;
    },
    generalLogger.write,
);

/*========================================================================================*/

const getAllPluginConfigObjects = async (): Promise<object[]> => {
    let configObjects: object[] = [];

    const pluginBasePath = getPluginConfigBasePath();
    for (const pluginConfigPath of await getAllFiles([pluginBasePath])) {
        const rawConfigData = await fsPromises.readFile(pluginConfigPath);
        const configObj = validationUtil.parseAndValidateJson(rawConfigData.toString(), true);
        if (!configObj) {
            generalLogger.write(SeverityEnum.warning, `${logArea} - ${getAllPluginConfigObjects.name}`,
                `Invalid JSON in plugin config: ${pluginBasePath}`);
        } else {
            configObjects.push(configObj);
        }
    }

    return configObjects;
}

const getJson = async (pluginName: string, defaultConfig: string|object): Promise<string | null> => {
    pluginName = removeExtension(pluginName);

    if (defaultConfig && typeof defaultConfig === 'string') {
        const configObj = validationUtil.parseAndValidateJson(defaultConfig, true);
        if (!configObj) {
            pluginLogger.write(SeverityEnum.error, pluginName, `${logArea} - ${getJson.name}`, `Attempted to use invalid json as default`);
            return null;
        }
    } else if (defaultConfig) {
        defaultConfig = JSON.stringify(defaultConfig, null, 4);
    }

    if (!inMemConfigManagers[pluginName]) {
        inMemConfigManagers[pluginName] = new ConfigManager(
            getPluginConfigPath(pluginName),
            async (severityEnum, area, msg) => pluginLogger.write(severityEnum, pluginName, area, msg),
            pluginConfigMgrInitializer(pluginName, defaultConfig),
            pluginName);
    }

    return await inMemConfigManagers[pluginName].getJson();
}

const get = (pluginName: string): Promise<any | null> => {
    pluginName = removeExtension(pluginName);

    if (!inMemConfigManagers[pluginName]) {
        inMemConfigManagers[pluginName] = new ConfigManager(
            getPluginConfigPath(pluginName),
            async (severityEnum, area, msg) => pluginLogger.write(severityEnum, pluginName, area, msg),
            pluginConfigMgrInitializer(pluginName, null),
            pluginName
        );
    }
    
    return inMemConfigManagers[pluginName].get();
}

const save = async (pluginName: string, defaultConfig: string|object, shouldEnable?: boolean): Promise<void | null> => {
    try {
        let defaultConfigString = defaultConfig && typeof defaultConfig === 'string'
            ? defaultConfig
            : JSON.stringify(defaultConfig, null, 4);

        pluginName = removeExtension(pluginName);
        const configObj = validationUtil.parseAndValidateJson(defaultConfigString, true);
        if (!configObj) {
            pluginLogger.write(SeverityEnum.error, pluginName, `${logArea} - ${save.name}`, `Attempted to save invalid json`);
            return;
        }

        if (shouldEnable) {
            configObj.enabled = true;
            defaultConfigString = JSON.stringify(configObj, null, 4);
        }

        if (!inMemConfigManagers[pluginName]) {
            inMemConfigManagers[pluginName] = new ConfigManager(
                getPluginConfigPath(pluginName),
                async (severityEnum, area, msg) => pluginLogger.write(severityEnum, pluginName, area, msg),
                pluginConfigMgrInitializer(pluginName, defaultConfigString),
                pluginName);
        }

        return await inMemConfigManagers[pluginName].set(configObj);
    } catch (e) {
        generalLogger.write(SeverityEnum.error, `${logArea} - ${save.name}`, `Exception - ${e}`);
    }
}

const watch = async (callback: (eventName: string, pluginPath: string, diffs: string[] | null) => Promise<void>): Promise<void> => {
    if (!watcher) return;

    // First time app is run on machine the plugin directory config might not exist yet
    const pluginBasePath = getPluginConfigBasePath();
    if (!doesPathExist(pluginBasePath)) makeAllDirInPath(pluginBasePath);

    return await watcher.beginWatch(callback);
}

const endWatch = async (): Promise<void> => {
    if (watcher) {
        await watcher.endWatch();
        (watcher as any) = null;
    }
}

/*========================================================================================*/

export {
    watch,
    endWatch,
    save,
    get,
    getJson,
    getAllPluginConfigObjects,
};