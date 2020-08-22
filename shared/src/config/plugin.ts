import { generalLogger, SeverityEnum, pluginLogger, validationUtil } from '..';
import * as path from 'path';
import { getPluginConfigPath, removeExtension, getPluginConfigBasePath } from '../util/files';
import { ConfigManager } from './ConfigManager';
import { Watcher } from './watcher';

/*========================================================================================*/

const logArea = "plugin config";

// TODO: remove if not needed
//const getPluginNameFromPath = (filePath: string): string => removeExtension(path.basename(filePath));

const inMemConfigManagers: { [pluginName: string]: ConfigManager } = {};

const watcher = new Watcher(getPluginConfigBasePath(), async (filePath) => {
    const pluginName = removeExtension(filePath);
    return inMemConfigManagers[pluginName]
        ? await inMemConfigManagers[pluginName].getFromMemory()
        : null;
});

/*========================================================================================*/

const getJson = async (pluginName: string, defaultJsonConfig: string|null = null): Promise<string | null> => {
    pluginName = removeExtension(pluginName);

    if (defaultJsonConfig) {
        const configObj = validationUtil.parseAndValidateJson(defaultJsonConfig, true);
        if (!configObj) {
            pluginLogger.write(SeverityEnum.error, pluginName, `${logArea} - ${getJson.name}`, `Attempted to use invalid json as default`);
            return null;
        }
    }

    if (!inMemConfigManagers[pluginName]) {
        inMemConfigManagers[pluginName] = new ConfigManager(getPluginConfigPath(pluginName), defaultJsonConfig, pluginName);
    }

    return await inMemConfigManagers[pluginName].getJson();
}

const get = (pluginName: string): Promise<any | null> => {
    if (!inMemConfigManagers[pluginName]) {
        inMemConfigManagers[pluginName] = new ConfigManager(getPluginConfigPath(pluginName), null, pluginName);
    }
    return inMemConfigManagers[pluginName].get();
}

const save = async (pluginName: string, jsonConfig: string | null, shouldEnable?: boolean): Promise<void | null> => {
    try {
        pluginName = removeExtension(pluginName);
        const configObj = validationUtil.parseAndValidateJson(jsonConfig, true);
        if (!configObj) {
            pluginLogger.write(SeverityEnum.error, pluginName, `${logArea} - ${save.name}`, `Attempted to save invalid json`);
            return;
        }

        if (shouldEnable) {
            configObj.enabled = true;
            jsonConfig = JSON.stringify(configObj, null, 4);
        }

        if (!inMemConfigManagers[pluginName]) {
            inMemConfigManagers[pluginName] = new ConfigManager(getPluginConfigPath(pluginName), jsonConfig, pluginName);
        }

        return await inMemConfigManagers[pluginName].set(configObj);
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, `${logArea} - ${save.name}`, `Exception - ${e}`);
    }
}

const watch = async (callback: (eventName: string, pluginPath: string, diffs: string[]|null) => Promise<void>): Promise<void> => {
    if (!watcher) return;
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
};