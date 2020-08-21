import 'mocha';
import { expect } from 'chai';
import * as sh from 'shelljs';
import { promises as fsPromises } from 'fs';

import { fileUtil } from '..';
import * as generalConfig from './general';
import { GeneralConfig } from './GeneralConfig';
import { ConfigManager } from './ConfigManager';

describe('** InMemoryConfigManager **', () => {
    let config: GeneralConfig;
    let configManager = new ConfigManager(fileUtil.getGeneralConfigPath(), null);

    before(() => {
        config = {
            userPluginPaths: ['/home/user/foo'],
            heartBeatPollIntervalInSeconds: 5,
            userPluginMetaExtension: 'foo',
            enableDebug: true,
            lastUpdatedTimeStamp: 0,
        };

        const testDir = fileUtil.getAppBaseDir();
        if (testDir.endsWith('test')) sh.rm('-rf', testDir);
    });

    describe('A call to diffBetweenFileAndMem', () => {
    });

    after(() => {
        const testDir = fileUtil.getAppBaseDir();
        if (testDir.endsWith('test')) sh.rm('-rf', testDir);
    });
});