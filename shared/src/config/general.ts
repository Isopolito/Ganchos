import * as path from 'path';
import { promises as fsPromises } from 'fs';

import { getGeneralConfigPath, getAppBaseDir } from '../util/files';
import { GeneralConfig } from './GeneralConfig';
import { ConfigManager } from './ConfigManager';
import { Watcher } from './watcher';
import { fileUtil } from '..';

/*========================================================================================*/

const defaultConfig: GeneralConfig = {
    heartBeatPollIntervalInSeconds: 5,
    userPluginPaths: [path.join(getAppBaseDir(), 'plugins')],
    lastUpdatedTimeStamp: 0,
    userPluginMetaExtension: 'meta',
};

const inMemConfigInitializer = async (): Promise<void> => {
    // create general config path with default config file
    const configFilePath = getGeneralConfigPath();
    if (!fileUtil.doesPathExist(configFilePath)) {
        fileUtil.touch(configFilePath);
        await fsPromises.writeFile(configFilePath, JSON.stringify(defaultConfig));
    }

    // create default plugin path if not exists
    fileUtil.makeAllDirInPath(defaultConfig.userPluginPaths[0]);
}
const inMemConfigMgr = new ConfigManager(getGeneralConfigPath(), inMemConfigInitializer, 'general');

const watcher = new Watcher(getGeneralConfigPath(), () => inMemConfigMgr.getFromMemory());

/*========================================================================================*/

const getJson = (): Promise<string | null> => inMemConfigMgr.getJson();

const get = (): Promise<GeneralConfig | null> => inMemConfigMgr.get();

const save = (config: GeneralConfig): Promise<void> => inMemConfigMgr.set(config);

const watch = (callback: (eventName: string, configFile: string, diffs: string[]|null) => Promise<void>): Promise<void> => watcher.beginWatch(callback);

const endWatch = (): Promise<void> => watcher.endWatch();

/*========================================================================================*/

export {
    watch,
    endWatch,
    save,
    get,
    getJson,
};
