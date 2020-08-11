import 'mocha';
import { promises as fsPromises } from 'fs';
import { expect } from 'chai';
import * as sh from 'shelljs';
import { fileUtil } from '..';
import * as generalConfig from './general';
import { GeneralConfig, implementsGeneralConfig } from './GeneralConfig';

describe('** Plugin Config **', () => {
    let config: GeneralConfig;

    before(() => {
        config = {
            userPluginPaths: ['/home/user/foo'],
            heartBeatPollIntervalInSeconds: 5,
            userPluginMetaExtension: 'foo',
            enableDebug: true,
            lastUpdatedTimeStamp: 0,
        };
    });

    describe('After saving a general config', () => {
        before(() => {
            const testDir = fileUtil.getAppBaseDir();
            if (testDir.endsWith('test')) sh.rm('-rf', testDir);
        });

        it('a "get" call should return the same config object', async () => {
            await generalConfig.save(config);

            const fetchedConfig = await generalConfig.get() as GeneralConfig;
            fetchedConfig.lastUpdatedTimeStamp = 0; // don't care about this

            expect(fetchedConfig).to.eql(config);
        });

        after(() => {
            const testDir = fileUtil.getAppBaseDir();
            if (testDir.endsWith('test')) sh.rm('-rf', testDir);
        });
    });

    describe(`A call to ${generalConfig.getAndCreateDefaultIfNotExist.name}`, () => {
        beforeEach(() => {
            const testDir = fileUtil.getAppBaseDir();
            if (testDir.endsWith('test')) sh.rm('-rf', testDir);
        });

        it('should return a GeneralConfig obj', async () => {
            const configObj = await generalConfig.getAndCreateDefaultIfNotExist();

            expect(implementsGeneralConfig(configObj)).to.be.true;
        });

        it('should create necessary directories and a default general config file', async () => {
            await generalConfig.getAndCreateDefaultIfNotExist();
            const configObj = await generalConfig.get(); 

            expect(implementsGeneralConfig(configObj)).to.be.true;
        });

        it('should create default plugin directory', async () => {
            const configObj = await generalConfig.getAndCreateDefaultIfNotExist() as GeneralConfig;

            const exists = sh.test('-d', configObj.userPluginPaths[0]);

            expect(exists).to.be.true;
        });

        after(() => {
            const testDir = fileUtil.getAppBaseDir();
            if (testDir.endsWith('test')) sh.rm('-rf', testDir);
        });
    });

    describe(`A call to ${generalConfig.diffBetweenFileAndMem.name}`, () => {
        before(async () => {
            const testDir = fileUtil.getAppBaseDir();
            if (testDir.endsWith('test')) sh.rm('-rf', testDir);
        });

        it('should accurately report differences between config on disk and in memory', async () => {
            await generalConfig.save(config);
            config.userPluginMetaExtension = 'barley';
            const configPath = fileUtil.getConfigPath();
            await fsPromises.writeFile(configPath, JSON.stringify(config, null, 4));

            const diffs = await generalConfig.diffBetweenFileAndMem();

            expect(diffs).includes('userPluginMetaExtension');
        });

        after(() => {
            const testDir = fileUtil.getAppBaseDir();
            if (testDir.endsWith('test')) sh.rm('-rf', testDir);
        });
    });
});