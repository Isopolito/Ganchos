import * as path from 'path';

import { getGeneralConfigPath, getAppBaseDir } from '../util/files';
import { GeneralConfig } from './GeneralConfig';
import { ConfigManager } from './ConfigManager';
import { Watcher } from './watcher';

/*========================================================================================*/

const defaultConfig: GeneralConfig = {
    heartBeatPollIntervalInSeconds: 5,
    userPluginPaths: [path.join(getAppBaseDir(), 'plugins')],
    lastUpdatedTimeStamp: 0,
    userPluginMetaExtension: 'meta',
};

const inMemConfigMgr = new ConfigManager(getGeneralConfigPath(), JSON.stringify(defaultConfig), 'general');
const watcher = new Watcher(getGeneralConfigPath(), () => inMemConfigMgr.getFromMemory());

/*========================================================================================*/

const getJson = (): Promise<string | null> => inMemConfigMgr.getJson();

const get = async (): Promise<GeneralConfig | null> => await inMemConfigMgr.get() as GeneralConfig;

const save = async (config: GeneralConfig) => inMemConfigMgr.set(config);

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
