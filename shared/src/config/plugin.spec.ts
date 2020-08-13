import 'mocha';
import { promises as fsPromises } from 'fs';
import { expect } from 'chai';
import * as sh from 'shelljs';
import { fileUtil } from '..';
import * as generalConfig from './general';
import * as pluginConfig from './plugin';
import { touch } from '../util/files';

const pluginName = 'test';

describe('** Plugin Config **', () => {
    let pluginConfigObj: any = {};
    let pluginConfigJson = '';
    let generalConfigObj;

    beforeEach(async () => {
        const testDir = fileUtil.getAppBaseDir();
        if (testDir.endsWith('test')) sh.rm('-rf', testDir);

        generalConfigObj = await generalConfig.getAndCreateDefaultIfNotExist();

        pluginConfigObj = {
            watchPaths: ['/home/user/foo'],
            propertyOne: 'p1',
            propertyTwo: 'p2',
            enabled: true
        };

        pluginConfigJson = JSON.stringify(pluginConfigObj, null, 4);
    });

    describe('The "get" call', () => {
        it('should return null if plugin config JSON is invalid and "shouldValidateJson" param is true', async () => {
            const configPath = fileUtil.getPluginConfigPath(pluginName);
            await touch(configPath);
            await fsPromises.writeFile(configPath, '{ bad json }');

            const configObj = await pluginConfig.get(pluginName, true);

            expect(configObj).to.be.null;
        });

        it('should return  plugin config JSON (even when invalid) if "shouldValidateJson" param is false', async () => {
            const configPath = fileUtil.getPluginConfigPath(pluginName);
            await touch(configPath);
            await fsPromises.writeFile(configPath, '{ bad json }');

            const configJson = await pluginConfig.get(pluginName, false);

            expect(configJson).to.equal('{ bad json }');
        });
    });

    describe('When saving a plugin configuration', () => {
        it('a "get" call should return the same plugin configuration', async () => {
            await pluginConfig.save(pluginName, pluginConfigJson);

            const fetchedConfigJson = await pluginConfig.get(pluginName);

            expect(fetchedConfigJson).to.eql(pluginConfigJson);
        });

        it('"enabled" flag on plugin should be TRUE if it is omitted from plugin json and "shouldEnable" param is TRUE', async () => {
            delete pluginConfigObj.enabled;
            await pluginConfig.save(pluginName, JSON.stringify(pluginConfigObj, null, 4), true);

            const fetchedConfigObj = JSON.parse(await pluginConfig.get(pluginName) as string);

            expect(fetchedConfigObj.enabled).to.be.true;
        });

        it('"enabled" flag on plugin should be undefined if it is omitted from plugin json and "shouldEnable" param is FALSE', async () => {
            delete pluginConfigObj.enabled;
            await pluginConfig.save(pluginName, JSON.stringify(pluginConfigObj, null, 4));

            const fetchedConfigObj = JSON.parse(await pluginConfig.get(pluginName) as string);

            expect(fetchedConfigObj.enabled).to.be.undefined;
        });
    });

    describe(`A call to ${pluginConfig.diffBetweenFileAndMem.name}`, () => {
        it('should accurately report differences between config on disk and in memory', async () => {
            await pluginConfig.save(pluginName, pluginConfigJson);
            pluginConfigObj.propertyOne = 'new prop value';
            const configPath = fileUtil.getPluginConfigPath(pluginName);
            await fsPromises.writeFile(configPath, JSON.stringify(pluginConfigObj, null, 4));

            const diffs = await pluginConfig.diffBetweenFileAndMem(pluginName);

            expect(diffs).includes('propertyOne');
        });
    });

    describe(`A call to ${pluginConfig.getConfigJsonAndCreateConfigFileIfNeeded.name}`, () => {
        it('Should create the plugin config file with the default JSON parameter if the config file does not yet exist', async () => {
            await pluginConfig.getConfigJsonAndCreateConfigFileIfNeeded(pluginName, pluginConfigJson);
            const fetchedConfigJson = await pluginConfig.get(pluginName);

            expect(fetchedConfigJson).to.eql(pluginConfigJson);
        });

        it('Should NOT create config file if one already exists', async () => {
            await pluginConfig.getConfigJsonAndCreateConfigFileIfNeeded(pluginName, pluginConfigJson);
            const fetchedConfigJson = await pluginConfig.getConfigJsonAndCreateConfigFileIfNeeded(pluginName, '{"foo": "bar"}');

            expect(fetchedConfigJson).to.eql(pluginConfigJson);
        });
    });
});

after(() => {
    const testDir = fileUtil.getAppBaseDir();
    if (testDir.endsWith('test')) sh.rm('-rf', testDir);
});
