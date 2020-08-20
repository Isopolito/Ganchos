import 'mocha';
import { promises as fsPromises } from 'fs';
import { expect } from 'chai';
import * as sh from 'shelljs';
import { fileUtil } from '..';
import * as generalConfig from './general';
import { GeneralConfig, implementsGeneralConfig } from './GeneralConfig';
import { InMemoryConfigManager } from './InMemoryConfigManager';

describe('** InMemoryConfigManager **', () => {
    let config: GeneralConfig;
    let inMemConfigManager = new InMemoryConfigManager(generalConfig.getJsonFromConfigFile);

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
        it('should accurately report differences between config on disk and in memory', async () => {
            // Make sure general config exists on disk and initialize in mem config mgr with its JSON
            await generalConfig.save(config);
            const json = await generalConfig.getJsonFromConfigFile();
            inMemConfigManager.initializeIfNeeded(null, json);

            // Update config contents on disk, but not what's in memory
            config.userPluginMetaExtension = 'barley';
            const configPath = fileUtil.getConfigPath();
            await fsPromises.writeFile(configPath, JSON.stringify(config, null, 4));

            const diffs = await inMemConfigManager.diffBetweenFileAndMem();

            expect(diffs).includes('userPluginMetaExtension');
        });

    });

    after(() => {
        const testDir = fileUtil.getAppBaseDir();
        if (testDir.endsWith('test')) sh.rm('-rf', testDir);
    });
});