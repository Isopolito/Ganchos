import 'mocha';
import { expect } from 'chai';
import * as sh from 'shelljs';
import * as fileUtil from '../util/files';
import * as validationUtil from '../util/validation';
import * as generalConfig from './general';
import { GeneralConfig, implementsGeneralConfig } from './GeneralConfig';

describe('** General Config **', () => {
    let config: GeneralConfig;

    before(() => {
        const testDir = fileUtil.getAppBaseDir();
        if (testDir.endsWith('test')) sh.rm('-rf', testDir);

        config = {
            pluginPaths: ['/home/user/foo'],
            heartBeatPollIntervalInSeconds: 5,
            pluginScheduleIntervalFloorInMinutes: 0.5,
            pluginMetaExtension: 'foo',
            eventQueuePluginExecutionTimeout: 0, 
            eventQueuePluginExecutionConcurrency: 3,
            enableDebug: true,
            ipChangePollingIntervalInMinutes: 1,
            ipUpPollingIntervalInMinutes: 1,
        };
    });

    describe('The first call to config logic', () => {
        it('should create general config defaults', async () => {
            const fetchedConfig = await generalConfig.get() as GeneralConfig;

            expect(implementsGeneralConfig(fetchedConfig)).to.be.true;
        });

        it('should create default plugin directory', async () => {
            const configObj = await generalConfig.get() as GeneralConfig;

            const exists = sh.test('-d', configObj.pluginPaths[0]);

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