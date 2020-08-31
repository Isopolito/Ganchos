import 'mocha';
import { expect } from 'chai';
import * as path from 'path';
import * as sh from 'shelljs';
import { promises as fsPromises } from 'fs';

import { GeneralConfig } from './GeneralConfig';
import * as generalLogger from '../logging/generalLogger'
import { ConfigManager } from './ConfigManager';
import { SeverityEnum } from '../logging/SeverityEnum';
import * as fileUtil from '../util/files';

describe('** Config Manager **', () => {
    let configManager: ConfigManager;
    const configFilePath = path.join(sh.tempdir(), 'test_config_file');

    describe(`Calling getJson`, () => {
        it('when config file does not exist it should return null', async () => {
            configManager = new ConfigManager(configFilePath, generalLogger.write, async () => { });

            const jsonConfig = await configManager.getJson();

            expect(jsonConfig).to.be.null;
        });

        it('when config file does not exist it should log an error', async () => {
            configManager = new ConfigManager(
                configFilePath,
                (severity, area, msg) => expect(severity).to.be.equal(SeverityEnum.error, "Error message was not logged"),
                async () => { }
            );

            await configManager.getJson();
        });

        it('should return back correct json string', async () => {
            const json = '{"foo": "bar"}';
            configManager = new ConfigManager(configFilePath, generalLogger.write, () => fsPromises.writeFile(configFilePath, json));

            const jsonConfig = await configManager.getJson();

            expect(jsonConfig).to.be.eq(json);
        });
    });

    describe(`Calling getFromMemory`, () => {
        it('should return a clone of the config instance when "makeClone" parameter is missing', async () => {
            configManager = new ConfigManager(configFilePath, generalLogger.write, async () => {
                await fsPromises.writeFile(configFilePath, '{"foo": "bar"}');
            });

            const jsonConfigOriginalObj = await configManager.getFromMemory();
            const jsonConfigSecondObj = await configManager.getFromMemory();

            expect(jsonConfigOriginalObj).to.not.be.equal(jsonConfigSecondObj, "Config instance was not cloned");
        });

        it('should return the same config instance when "makeClone" parameter is false', async () => {
            configManager = new ConfigManager(configFilePath, generalLogger.write, () => fsPromises.writeFile(configFilePath, '{"foo": "bar"}'));

            const jsonConfigOriginalObj = await configManager.getFromMemory(false);
            const jsonConfigSecondObj = await configManager.getFromMemory(false);

            expect(jsonConfigOriginalObj).to.be.equal(jsonConfigSecondObj, "A different config instance was returned");
        });

        it('should return the most recently saved config instance', async () => {
            const json = '{"foo": "bar"}';

            configManager = new ConfigManager(configFilePath, generalLogger.write, async () => {
                await fsPromises.writeFile(configFilePath, json);
            });

            const jsonConfigObj = await configManager.getFromMemory();

            expect(jsonConfigObj).to.be.eql(JSON.parse(json), "Config instance does not match last save");
        });

        it('should return empty object if config file does not exist', async () => {
            if (fileUtil.doesPathExist(configFilePath)) sh.rm(configFilePath);
            configManager = new ConfigManager(configFilePath, generalLogger.write, async () => { });

            const jsonConfigObj = await configManager.getFromMemory();

            expect(jsonConfigObj).to.be.eql({}, "Config instance was not empty");
        });
    });

    describe(`Calling get`, () => {
        it(`when config file does not exist should return empty object`, async () => {
            if (fileUtil.doesPathExist(configFilePath)) sh.rm(configFilePath);
            configManager = new ConfigManager(configFilePath, generalLogger.write, async () => { });

            const jsonConfig = await configManager.get();

            expect(jsonConfig).to.be.eql({}, "Config instance is not an empty object");
        });

        it(`when config file does not exist it should log an error`, async () => {
            if (fileUtil.doesPathExist(configFilePath)) sh.rm(configFilePath);
            configManager = new ConfigManager(
                configFilePath,
                (severity, area, msg) => expect(severity).to.be.equal(SeverityEnum.error, "Error message was not logged"),
                async () => { }
            );

            await configManager.get();
        });

        it(`should return back correct config instance`, async () => {
            const json = '{"foo": "bar"}';
            configManager = new ConfigManager(configFilePath, generalLogger.write, () => fsPromises.writeFile(configFilePath, json));

            const configObj = await configManager.get();

            expect(configObj).to.be.eql(JSON.parse(json));
        });
    });

    after(() => {
        configManager = null as any;
        if (fileUtil.doesPathExist(configFilePath)) sh.rm(configFilePath);
    });
});