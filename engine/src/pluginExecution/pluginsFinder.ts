import { promises as fs } from 'fs'
import * as appRoot from 'app-root-path'
import * as path from 'path'
import { fileUtil, validationUtil, generalLogger, SeverityEnum, generalConfig, UserPlugin, implementsUserPlugin } from 'ganchos-shared';

const logArea = "pluginFinder";

const fetchGanchosPlugins = async (convertExtensionToJs?: boolean): Promise<string[]> => {
    try {
        // TODO: Figure out how to avoid hard coding this path
        const dirPath = path.join(`${appRoot}`, '/src/pluginExecution/pluginCollection');
        return (await fs.readdir(dirPath))
            .map(file => convertExtensionToJs ? file.replace(".ts", ".js") : file);
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, logArea, `Unable to fetch ganchos specific plugins: ${e}`);
        return [];
    }
}

const fetchUserPlugins = async (): Promise<UserPlugin[]> => {
    try {
        const config = await generalConfig.getAndCreateDefaultIfNotExist();
        if (!config.userPluginPaths) return [];

        const plugins = [];
        for (const file of await fileUtil.getAllFiles(config.userPluginPaths, config.userPluginMetaExtension)) {
            const rawData = await fs.readFile(file);
            const plugin = validationUtil.validateJson(rawData.toString(), true);
            delete plugin['//']; // Remove the comment hack from the meta file
            if (!implementsUserPlugin(plugin)) {
                await generalLogger.write(SeverityEnum.error, logArea, `The JSON in plugin meta file '${file}' is not a valid UserPlugin`);
                continue;
            }
            plugin.path = path.dirname(file);
            plugins.push(plugin);
        }
        return plugins;
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, logArea, `Unable to fetch user plugins: ${e}`);
        return [];
    }
}

export {
    fetchGanchosPlugins,
    fetchUserPlugins,
}