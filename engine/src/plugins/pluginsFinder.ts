import { promises as fs } from 'fs';
import { generalLogger, SeverityEnum } from 'ganchas-shared'

const fetchNodePlugins = async (): Promise<string[]> => {
    try {
        return await fs.readdir('./pluginCollection');
    } catch (e) {
        await generalLogger.write(SeverityEnum.critical, "plugins", `Unable to fetch list of plugins: ${e}`);
    }
}

export {
    fetchNodePlugins
}