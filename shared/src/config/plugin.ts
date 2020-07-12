import { promises as fs } from 'fs';
import * as properLockFile from 'proper-lockfile';
import { getPluginConfigPath, doesPathExist, touch } from '../util/files';
import { generalLogger, SeverityEnum } from '..';
import { isJsonStringValid } from '../util/validation';

// NOTE: If it became an necessary, plugin json config can be cached for each plugin

const get = async (pluginName: string): Promise<string | null> => {
    const configPath = getPluginConfigPath(pluginName);
    if (!doesPathExist(configPath)) return null;

    try {
        const rawData = await fs.readFile(configPath);
        const jsonString = rawData.toString();
        if (isJsonStringValid(jsonString)) {
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

const save = async (pluginName: string, jsonConfig: string) => {
    if (jsonConfig === null) {
        await generalLogger.write(SeverityEnum.error, "plugin config - save", `pluginName and jsonConfig required`, true);
        return null;
    }

    try {
        const configPath = getPluginConfigPath(pluginName);
        doesPathExist(configPath) || await touch(configPath);

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
