import 'mocha'
import path from 'path'
import { promises as fs } from 'fs';
import { expect } from 'chai'
import * as sh from 'shelljs'

import { fileUtil, GeneralConfig } from '../shared'

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
            // setup 

            // execute

            // assert
            expect().to.be.true;
        });

        it('should NOT start when shouldStart is false', async () => {
            // setup 

            // execute

            // assert
            expect().to.be.true;
        });

        it('should output to stdout when started', async () => {
            // setup 

            // execute

            // assert
            expect().to.be.true;
        });

        it('should be in an error state if module command can not be found', async () => {
            // setup 

            // execute

            // assert
            expect().to.be.true;
        });

        describe('Loading multiple modules from a Module Config list', () => {
        }

        describe('Loading multiple modules when explicitly providing a module config file', () => {
        }

        describe('Loading multiple modules from config specified in ganchos general configuration', () => {
        }

    }

    after(() => {
        const testDir = fileUtil.getAppBaseDir();
        if (testDir.endsWith('test')) sh.rm('-rf', testDir);
    });
});