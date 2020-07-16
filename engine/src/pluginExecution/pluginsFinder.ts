import { promises as fs } from 'fs'
import * as appRoot from 'app-root-path'
import * as path from 'path'
import { generalLogger, SeverityEnum } from 'ganchos-shared';

const fetchGanchosPlugins = async (convertExtensionToJs?: boolean): Promise<string[]> => {
    try {
        const dirPath = path.join(`${appRoot}`, '/src/pluginExecution/pluginCollection');
        return (await fs.readdir(dirPath))
            .map(f => convertExtensionToJs ? f.replace(".ts", ".js") : f);
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, "plugins", `Unable to fetch list of plugins: ${e}`);
        return [];
    }
}

const fetchUserPlugins = async (): Promise<string[]> => {
    return [''];
}

export {
    fetchGanchosPlugins,
    fetchUserPlugins,
}