import 'mocha'
import path from 'path'
import { promises as fs } from 'fs';
import { expect } from 'chai'
import * as sh from 'shelljs'

import { fileUtil, GeneralConfig, systemUtil } from '../shared'
import { ModuleConfig } from './ModuleConfig'
import * as moduleLoader from './moduleLoader'

const makeModuleConfigFile = (moduleConfigPath: string): Promise<void> => {
        const json = `
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

        return fs.writeFile(moduleConfigPath, json);
}

describe('** Module Loader **', () => {
        let config: GeneralConfig;
        let moduleConfigPath: string;

        before(async () => {
                const testDir = fileUtil.getAppBaseDir();
                if (testDir.endsWith('test')) sh.rm('-rf', testDir);
                fileUtil.makeAllDirInPath(testDir);

                moduleConfigPath = path.join(testDir, `moduleConfig.json`);
                await makeModuleConfigFile(moduleConfigPath);

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
        });

        describe('Loading a single module from a Module Config', () => {
                it('should start immediately when shouldStart is true', async () => {
                        // arrange 
                        const config: ModuleConfig = {
                                name: "test",
                                path: "/usr/bin/sleep", // TODO: make os independent
                                shouldStart: true,
                                params: ["5"],
                        }

                        // act
                        const loadedModule = await moduleLoader.loadSingle(config)

                        expect(loadedModule.isInError, `is in error`).to.be.false;
                        expect(loadedModule.isStarted, `is started`).to.be.true;
                });

                it('should NOT start when shouldStart is false', async () => {
                        // arrange 
                        const config: ModuleConfig = {
                                name: "test",
                                path: "/usr/bin/dir", // TODO: make os independent
                                shouldStart: false,
                                params: [],
                        }

                        // act
                        const loadedModule = await moduleLoader.loadSingle(config)

                        expect(loadedModule.isInError, `is in error`).to.be.false;
                        expect(loadedModule.isStarted, `is started`).to.be.false;
                });

                it('should output to stdout when started', async () => {
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
                        //await systemUtil.waitInSeconds(0.1);
                });

                it('should be in an error state if module command can not be found', async () => {
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

        describe('Loading multiple modules from a Module Config list', async () => {
                it('one should start and one should not and neither should have errors', async () => {
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

                it('one should start and one should be in an error state if module command can not be found', async () => {
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

                it('one should output to stdout when started, the other is started w/no output; none have errors', async () => {
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
                                expect(data, `output should be captured`).to.equal("Hello World");
                        });

                        expect(dirModule.isInError, 'in error').to.be.false;
                        expect(dirModule.isStarted, 'is started').to.be.true;
                });
        });

        //describe('Loading multiple modules when explicitly providing a module config file', () => {
        //}

        //describe('Loading multiple modules from config specified in ganchos general configuration', () => {
        //}

        after(() => {
                const testDir = fileUtil.getAppBaseDir();
                if (testDir.endsWith('test')) sh.rm('-rf', testDir);
        });
});