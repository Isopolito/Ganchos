import { promises as fs } from 'fs';
import * as properLockFile from 'proper-lockfile';
import { getPluginConfigPath, doesPathExist, touch, removeExtension } from '../util/files';
import { generalLogger, SeverityEnum, pluginLogger } from '..';
import { validateJson } from '../util/validation';

const logArea = "plugin config";
// NOTE: If it became an necessary, plugin json config can be cached for each plugin

const get = async (pluginName: string, shouldValidateJson?: boolean): Promise<string | null> => {
    pluginName = removeExtension(pluginName);
    const configPath = getPluginConfigPath(pluginName);
    if (!doesPathExist(configPath)) return null;

    try {
        const rawData = await fs.readFile(configPath);
        const jsonString = rawData.toString();
        if (!shouldValidateJson || validateJson(jsonString)) {
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

const save = async (pluginName: string, jsonConfig: string, shouldEnable?: boolean) => {
    if (jsonConfig === null) {
        await generalLogger.write(SeverityEnum.error, `${logArea} - save`, `pluginName and jsonConfig required`, true);
        return null;
    }

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
        await fs.writeFile(configPath, jsonConfig);
        release();
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, `${logArea} - save`, e, true);
    }
}

/*========================================================================================*/

export {
    save,
    get,
};
