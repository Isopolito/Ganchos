import 'mocha'
import path from 'path'
import { promises as fs } from 'fs';
import { expect } from 'chai'
import * as sh from 'shelljs'

import { fileUtil, generalConfig, GeneralConfig } from '../shared'
import { ModuleConfig } from './ModuleConfig'
import * as moduleLoader from './moduleLoader'

const randomConfigFilePath = path.join(fileUtil.getAppBaseDir(), 'randomModuleConfig.json');

const makeModuleConfigFiles = (generalConfigModulePath: string): Promise<[void, void]> => {
    const randomFileJson = `
    [
        {
            "name": "cwd command random",
            "path": "cwd",
            "shouldStart": false,
            "params": []
        },
        {
            "name": "echo command random",
            "path": "echo",
            "shouldStart": true,
            "params": ["hello random world"]
        }
    ]
    `;

    const generalConfigJson = `
    [
        {
            "name": "dir command",
            "path": "dir",
            "shouldStart": true,
            "params": []
        },
        {
            "name": "cwd command",
            "path": "cwd",
            "shouldStart": false,
            "params": []
        },
        {
            "name": "echo command",
            "path": "echo",
            "shouldStart": true,
            "params": ["hello world"]
        }
    ]
    `;

    return Promise.all([fs.writeFile(randomConfigFilePath, randomFileJson),
    fs.writeFile(generalConfigModulePath, generalConfigJson)]);
}

describe('** Module Loader **', () => {
    let config: GeneralConfig;
    let moduleConfigPath: string;

    before(async () => {
        const testDir = fileUtil.getAppBaseDir();
        if (testDir.endsWith('test')) sh.rm('-rf', testDir);
        fileUtil.makeAllDirInPath(testDir);

        moduleConfigPath = path.join(testDir, `moduleConfig.json`);
        await makeModuleConfigFiles(moduleConfigPath);

        config = {
            pluginPaths: [path.join(testDir, `plugins`)],
            heartBeatPollIntervalInSeconds: 5,
            moduleConfigPath: moduleConfigPath,
            pluginScheduleIntervalFloorInMinutes: 0.5,
            pluginMetaExtension: 'foo',
            eventQueuePluginExecutionTimeout: 0,
            eventQueuePluginExecutionConcurrency: 3,
            enableDebug: true,
            ipChangePollingIntervalInMinutes: 1,
            ipUpPollingIntervalInMinutes: 1,
        };

        await generalConfig.save(config);
    });

    describe('When loading a single module from a Module Config', () => {
        it('it will start immediately when shouldStart is true', async () => {
            // arrange 
            const config: ModuleConfig = {
                name: "test",
                path: "/usr/bin/echo", // TODO: make os independent
                shouldStart: true,
                params: ["foo"],
            }

            // act
            const loadedModule = await moduleLoader.loadSingle(config)

            // assert
            expect(loadedModule.isInError, `is in error`).to.be.false;
            expect(loadedModule.isStarted, `is started`).to.be.true;
        });

        it('it will NOT start when shouldStart is false', async () => {
            // arrange 
            const config: ModuleConfig = {
                name: "test",
                path: "/usr/bin/dir", // TODO: make os independent
                shouldStart: false,
                params: [],
            }

            // act
            const loadedModule = await moduleLoader.loadSingle(config)

            // assert
            expect(loadedModule.isInError, `is in error`).to.be.false;
            expect(loadedModule.isStarted, `is started`).to.be.false;
        });

        it('it will output to stdout when started', async () => {
            // arrange 
            const config: ModuleConfig = {
                name: "test",
                path: "/usr/bin/echo", // TODO: make os independent
                shouldStart: true,
                params: ["Hello World"],
            }

            // act
            const loadedModule = await moduleLoader.loadSingle(config)
            loadedModule.process.on('data', (data) => {
                // assert
                expect(data, `output should be captured`).to.equal("Hello World");
            });

            // assert
            expect(loadedModule.isStarted, `is started`).to.be.true;
        });

        it('it will be in an error state if module command can not be found', async () => {
            // arrange 
            const config: ModuleConfig = {
                name: "test",
                path: "dskjfasdksdfjksdfkjs",
                shouldStart: true,
                params: [],
            }

            // act
            const loadedModule = await moduleLoader.loadSingle(config)

            // assert
            expect(loadedModule.isInError, 'is in error').to.be.true;
            expect(loadedModule.isStarted, 'is started').to.be.false;
        });
    });

    describe('When loading multiple modules from a Module Config list', async () => {
        it('one will start and one will not and neither will have errors', async () => {
            // arrange
            const configs: ModuleConfig[] = [{
                name: "test1",
                path: "/usr/bin/echo", // TODO: make os independent
                shouldStart: true,
                params: ["Hello World"],
            },
            {
                name: "test2",
                path: "/usr/bin/dir", // TODO: make os independent
                shouldStart: false,
                params: [],
            }]

            // act
            const loadedModules = await moduleLoader.load(configs);
            const echoModule = loadedModules.find(c => c.name === `test1`);
            const dirModule = loadedModules.find(c => c.name === `test2`);

            // assert
            expect(echoModule.isInError, 'is in error').to.be.false;
            expect(echoModule.isStarted, 'is started').to.be.true;

            expect(dirModule.isInError, 'is in error').to.be.false;
            expect(dirModule.isStarted, 'is started').to.be.false;
        });

        it('one will start and one will be in an error state if module command can not be found', async () => {
            // arrange
            const configs: ModuleConfig[] = [{
                name: "test1",
                path: "asdfasdfasdfasdf", // TODO: make os independent
                shouldStart: true,
                params: ["Hello World"],
            },
            {
                name: "test2",
                path: "/usr/bin/dir", // TODO: make os independent
                shouldStart: true,
                params: [],
            }]

            // act
            const loadedModules = await moduleLoader.load(configs);
            const boinkedModule = loadedModules.find(c => c.name === `test1`);
            const dirModule = loadedModules.find(c => c.name === `test2`);

            // assert
            expect(boinkedModule.isInError, 'is in error').to.be.true;
            expect(boinkedModule.isStarted, 'is started').to.be.false;

            expect(dirModule.isInError, 'is in error').to.be.false;
            expect(dirModule.isStarted, 'is started').to.be.true;
        });

        it('one will output to stdout when started and the other will start w/no output; neither will have errors', async () => {
            // arrange
            const configs: ModuleConfig[] = [{
                name: "test1",
                path: "/usr/bin/dir", // TODO: make os independent
                shouldStart: true,
                params: [],
            },
            {
                name: "test2",
                path: "/usr/bin/echo", // TODO: make os independent
                shouldStart: true,
                params: ["Hello World"],
            }]

            // act
            const loadedModules = await moduleLoader.load(configs);
            const dirModule = loadedModules.find(c => c.name === `test1`);
            const outputModule = loadedModules.find(c => c.name === `test2`);

            // assert
            expect(outputModule.isInError).to.be.false;
            outputModule.process.on('data', (data) => {
                // assert
                expect(data, `output will be captured`).to.equal("Hello World");
            });

            expect(dirModule.isInError, 'in error').to.be.false;
            expect(dirModule.isStarted, 'is started').to.be.true;
        });
    });

    describe('When fetching module configurations', () => {
        it('it will use the path specified in the general config file if one is not provided', async () => {
            // act
            const configModules = await moduleLoader.getModuleConfigs();

            // assert
            expect(configModules.length).to.equal(3);
        });

        it('it will use the path passed in as a parameter', async () => {
            // act
            const configModules = await moduleLoader.getModuleConfigs(randomConfigFilePath);

            // assert
            expect(configModules.length).to.equal(2);
        });
    });

    after(() => {
        const testDir = fileUtil.getAppBaseDir();
        if (testDir.endsWith('test')) sh.rm('-rf', testDir);
    });
});