import { promises as fs } from 'fs'
import * as appRoot from 'app-root-path'
import * as path from 'path'
import {
    fileUtil, validationUtil, generalLogger,
    SeverityEnum, generalConfig, UserPlugin, pluginConfig
} from 'ganchos-shared';

const fetchGanchosPlugins = async (convertExtensionToJs?: boolean): Promise<string[]> => {
    try {
        // TODO: Figure out how to avoid hard coding this path
        const dirPath = path.join(`${appRoot}`, '/src/pluginExecution/pluginCollection');
        return (await fs.readdir(dirPath))
            .map(f => convertExtensionToJs ? f.replace(".ts", ".js") : f);
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, "plugins", `Unable to fetch list of plugins: ${e}`);
        return [];
    }
}

const fetchUserPlugins = async (): Promise<UserPlugin[]> => {
    const config = await generalConfig.getAndCreateDefaultIfNotExist();
    if (!config.userPluginPaths) return [];

    const plugins = [] as UserPlugin[];
    for (const file in fileUtil.getAllFiles(config.userPluginPaths)) {
        const rawData = await fs.readFile(file);
        const plugin = validationUtil.validateJson(rawData.toString());
        if (!plugin) {
        }

        plugins.push(plugin);
    }

    return plugins;
}

export {
    fetchGanchosPlugins,
    fetchUserPlugins,
}