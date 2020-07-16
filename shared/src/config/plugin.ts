import { promises as fs } from 'fs';
import * as properLockFile from 'proper-lockfile';
import { getPluginConfigPath, doesPathExist, touch } from '../util/files';
import { generalLogger, SeverityEnum } from '..';
import { isJsonStringValid } from '../util/validation';

// NOTE: If it became an necessary, plugin json config can be cached for each plugin

// TODO: Remove extensions from name when looking for file
const get = async (pluginName: string, shouldValidateJson?: boolean): Promise<string | null> => {
    const configPath = getPluginConfigPath(pluginName);
    if (!doesPathExist(configPath)) return null;

    try {
        const rawData = await fs.readFile(configPath);
        const jsonString = rawData.toString();
        if (!shouldValidateJson || isJsonStringValid(jsonString)) {
            return jsonString;
        } else {
            await generalLogger.write(SeverityEnum.error, "plugin config - get", `Invalid json in plugin config file for '${pluginName}'`, true);
            return null;
        }
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, "plugin config - get", `Error. Can't parse plugin config json: ${e}`, true);
        return null;
    }
}

// TODO: Remove extensions from name when saving
const save = async (pluginName: string, jsonConfig: string, shouldEnable?: boolean) => {
    if (jsonConfig === null) {
        await generalLogger.write(SeverityEnum.error, "plugin config - save", `pluginName and jsonConfig required`, true);
        return null;
    }

    try {
        const configPath = getPluginConfigPath(pluginName);
        doesPathExist(configPath) || await touch(configPath);

        if (shouldEnable) {
            const configObj = JSON.parse(jsonConfig);
            configObj.enabled = true;
            jsonConfig = JSON.stringify(configObj, null, 4);
        }

        const release = await properLockFile.lock(configPath);
        await fs.writeFile(configPath, jsonConfig);
        release();
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, "plugin config - save", e, true);
    }
}

/*========================================================================================*/

export {
    save,
    get,
};
