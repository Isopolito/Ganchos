import 'mocha';
import { expect } from 'chai';
import * as sh from 'shelljs';
import { fileUtil, validationUtil } from '..';
import * as generalConfig from './general';
import { GeneralConfig, implementsGeneralConfig } from './GeneralConfig';

describe('** General Config **', () => {
    let config: GeneralConfig;

    before(() => {
        const testDir = fileUtil.getAppBaseDir();
        if (testDir.endsWith('test')) sh.rm('-rf', testDir);

        config = {
            userPluginPaths: ['/home/user/foo'],
            heartBeatPollIntervalInSeconds: 5,
            userPluginMetaExtension: 'foo',
            enableDebug: true,
            lastUpdatedTimeStamp: 0,
        };
    });

    describe('This first call to config logic', () => {
        it('should create general config defaults', async () => {
            const fetchedConfig = await generalConfig.get() as GeneralConfig;

            expect(implementsGeneralConfig(fetchedConfig)).to.be.true;
        });

        it('should create default plugin directory', async () => {
            const configObj = await generalConfig.get() as GeneralConfig;

            const exists = sh.test('-d', configObj.userPluginPaths[0]);

            expect(exists).to.be.true;
        });
    });

    describe('After saving a general config', () => {
        it('a "get" call should return the same config object', async () => {
            await generalConfig.save(config);

            const fetchedConfig = await generalConfig.get() as GeneralConfig;

            expect(fetchedConfig).to.eql(config);
        });

        it('a "getJson" call should a valid json string', async () => {
            await generalConfig.save(config);

            const json = await generalConfig.getJson();
            const configObj = validationUtil.parseAndValidateJson(json, true);

            expect(implementsGeneralConfig(configObj)).to.be.true;
        });
    });

    describe(`A call to ${generalConfig.get.name}`, () => {
        it('should return a valid GeneralConfig obj', async () => {
            const configObj = await generalConfig.get();

            expect(implementsGeneralConfig(configObj)).to.be.true;
        });
    });

    after(() => {
        const testDir = fileUtil.getAppBaseDir();
        if (testDir.endsWith('test')) sh.rm('-rf', testDir);
    });
});