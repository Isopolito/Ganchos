import { promises as fs } from 'fs';
import { generalLogger, SeverityEnum } from 'ganchos-shared'
import appRoot from 'app-root-path';

const fetchNodePlugins = async (): Promise<string[]> => {
    try {
        const path = `${appRoot}/src/plugins/pluginCollection`;
        const files = await fs.readdir(path);
        return files;
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, "plugins", `Unable to fetch list of plugins: ${e}`);
    }
}

export {
    fetchNodePlugins
}