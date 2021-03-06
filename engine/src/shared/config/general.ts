import * as path from 'path';
import { promises as fsPromises } from 'fs';

import { Watcher } from './watcher';
import { GeneralConfig } from './GeneralConfig';
import { ConfigManager } from './ConfigManager';
import { write as genLogger } from '../logging/generalLogger';
import { makeAllDirInPath, touch, doesPathExist, getGeneralConfigPath, getAppBaseDir } from '../util/files';

/*========================================================================================*/

const defaultConfig: GeneralConfig = {
    heartBeatPollIntervalInSeconds: 5,
    pluginPaths: [path.join(getAppBaseDir(), 'plugins')],
    pluginMetaExtension: 'meta',
    pluginScheduleIntervalFloorInMinutes: 0.5,

    // No timeout. Milliseconds
    eventQueuePluginExecutionTimeout: 0, 

    // Each plugin can only have 3 executions concurrently when responding to events
    eventQueuePluginExecutionConcurrency: 3,

    ipUpPollingIntervalInMinutes: 0.5,
    ipChangePollingIntervalInMinutes: 1,
};

const configMgrInitializer = async (): Promise<void> => {
    // create general config path with default config file
    const configFilePath = getGeneralConfigPath();
    if (!doesPathExist(configFilePath)) {
        touch(configFilePath);
        await fsPromises.writeFile(configFilePath, JSON.stringify(defaultConfig, null, 4));
    }

    // create default plugin path if not exists
    makeAllDirInPath(defaultConfig.pluginPaths[0]);
}

const inMemConfigMgr = new ConfigManager(getGeneralConfigPath(), genLogger, configMgrInitializer, 'general');
const watcher = new Watcher(getGeneralConfigPath(), () => inMemConfigMgr.getFromMemory(), genLogger);

/*========================================================================================*/

const getJson = (): Promise<string | null> => inMemConfigMgr.getJson();

const get = async (): Promise<GeneralConfig | null> => {
    const configObj = await inMemConfigMgr.get();
    
    // Make sure if necessary config settings were remove from file that defaults are put back in
    for (const configSetting in defaultConfig) {
        if (!configObj[configSetting]) configObj[configSetting] = (defaultConfig as any)[configSetting];
    }
    return configObj;
}

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
