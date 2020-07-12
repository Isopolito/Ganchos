import { promises as fs } from 'fs'
import path from 'path'
import { generalLogger, SeverityEnum } from 'ganchos-shared'
import appRoot from 'app-root-path'

const fetchNodePlugins = async (convertExtensionToJs?: boolean): Promise<string[]> => {
    try {
        const dirPath = path.join(`${appRoot}`, '/src/plugins/pluginCollection');
        return (await fs.readdir(dirPath))
            .map(f => convertExtensionToJs ? f.replace(".ts", ".js") : f);
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, "plugins", `Unable to fetch list of plugins: ${e}`);
    }
}

export {
    fetchNodePlugins
}