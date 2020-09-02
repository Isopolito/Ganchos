import 'mocha'
import { expect } from 'chai'
import * as path from 'path'
import * as sh from 'shelljs'
import { promises as fsPromises } from 'fs'

import * as fileUtil from '../util/files'
import { ConfigManager } from './ConfigManager'
import { SeverityEnum } from '../logging/SeverityEnum'
import * as generalLogger from '../logging/generalLogger'
import { systemUtil } from '..'

describe('** Config Manager **', () => {
    let configManager: ConfigManager;
    const configFilePath = path.join(sh.tempdir(), 'test_config_file');

    describe(`Calling getJson`, () => {
        if (fileUtil.doesPathExist(configFilePath)) sh.rm(configFilePath);
        it('when config file does not exist should return null', async () => {
            configManager = new ConfigManager(configFilePath, generalLogger.write, async () => { });

            const jsonConfig = await configManager.getJson();

            expect(jsonConfig).to.be.null;
        });

        it('when config file does not exist should log an error', async () => {
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

        it(`when config file does not exist should log an error`, async () => {
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

    describe(`Calling set`, () => {
        it(`When the object passed in is null should not result in an error`, async () => {
            configManager = new ConfigManager(configFilePath, generalLogger.write, async () => { });

            expect(async () => await configManager.set(null)).to.not.throw();
        });

        it(`Should update the config instance`, async () => {
        if (fileUtil.doesPathExist(configFilePath)) sh.rm(configFilePath);
            configManager = new ConfigManager(configFilePath, generalLogger.write, async () => { });
            const configObj = { foo: 'bar' };
            await configManager.set(configObj);

            const mostRecentConfig = await configManager.get();

            expect(mostRecentConfig).to.be.eql(configObj);
        });

        it(`Near simultaneous calls should be run sequentially FIFO`, async () => {
            configManager = new ConfigManager(configFilePath, generalLogger.write, async () => { });
            const configObj1 = { foo: 'bar7', baz: 7 };
            const configObj2 = { foo: 'bar8', baz: 8 };
            const configObj3 = { foo: 'bar9', baz: 9 };
            const tasks = [
                configManager.set(configObj1),
                configManager.set(configObj2),
                configManager.set(configObj3)
            ];
            await Promise.all(tasks);

            await systemUtil.waitInSeconds(0.3);
            const mostRecentConfig = await configManager.get();

            expect(mostRecentConfig).to.be.eql(configObj3);
        });
    });

    after(() => {
        configManager = null as any;
        if (fileUtil.doesPathExist(configFilePath)) sh.rm(configFilePath);
    });
});