import 'mocha'
import { promises as fsPromises } from 'fs'
import { expect } from 'chai'
import * as sh from 'shelljs'
import { fileUtil } from '..'
import * as generalConfig from './general'
import * as pluginConfig from './plugin'
import { touch } from '../util/files'

const pluginName = 'test';

describe(`** Plugin Config **`, () => {
    let pluginConfigObj: any = {};
    let pluginConfigJson = ``;

    before(async () => {
        const testDir = fileUtil.getAppBaseDir();
        if (testDir.endsWith(`test`)) sh.rm(`-rf`, testDir);

        // This will recreate new config directory and sub directories
        await generalConfig.get();

        pluginConfigObj = {
            watchPaths: [`/home/user/foo`],
            propertyOne: `p1`,
            propertyTwo: `p2`,
            enabled: true
        };

        pluginConfigJson = JSON.stringify(pluginConfigObj, null, 4);
    });

    describe(`The "get" call`, () => {
        it(`should return null if plugin config JSON is invalid`, async () => {
            const configPath = fileUtil.getPluginConfigPath(pluginName);
            touch(configPath);
            await fsPromises.writeFile(configPath, `{ bad json }`);

            const configObj = await pluginConfig.get(pluginName);

            expect(configObj).to.be.eql({});
        });
    });

    describe(`When saving a plugin configuration`, () => {
        it(`a "get" call should return the same plugin configuration`, async () => {
            await pluginConfig.save(pluginName, pluginConfigJson);

            const fetchedConfigObj = await pluginConfig.get(pluginName);

            expect(fetchedConfigObj).to.eql(pluginConfigObj);
        });

        it(`"enabled" flag on plugin should be TRUE if it is omitted from plugin json and "shouldEnable" param is TRUE`, async () => {
            delete pluginConfigObj.enabled;
            await pluginConfig.save(pluginName, JSON.stringify(pluginConfigObj, null, 4), true);

            const fetchedConfigObj = await pluginConfig.get(pluginName);

            expect(fetchedConfigObj.enabled).to.be.true;
        });

        it(`"enabled" flag on plugin should be undefined if it is omitted from plugin json and "shouldEnable" param is FALSE`, async () => {
            delete pluginConfigObj.enabled;
            await pluginConfig.save(pluginName, JSON.stringify(pluginConfigObj, null, 4));

            const fetchedConfigObj = await pluginConfig.get(pluginName);

            expect(fetchedConfigObj.enabled).to.be.undefined;
        });
    });

    describe(`A call to ${pluginConfig.getJson.name}`, () => {
        it(`Should create the plugin config file with the default JSON parameter if the config file does not yet exist`, async () => {
            await pluginConfig.getJson(pluginName, pluginConfigJson);
            const fetchedConfigObj = await pluginConfig.get(pluginName);

            expect(fetchedConfigObj).to.eql(pluginConfigObj);
        });

        it(`Should NOT create config file if one already exists`, async () => {
            const originalJsonConfig = await pluginConfig.getJson(pluginName, pluginConfigJson);
            const fetchedConfigJson = await pluginConfig.getJson(pluginName, `{"foo": "bar"}`);

            expect(fetchedConfigJson).to.eql(originalJsonConfig);
        });
    });

    describe(`A call to ${pluginConfig.getAllPluginConfigObjects.name}`, async () => {
        before(async () => {
            const testDir = fileUtil.getAppBaseDir();
            if (testDir.endsWith(`test`)) sh.rm(`-rf`, testDir);

            // This will recreate new config directory and sub directories
            await generalConfig.get();

            await pluginConfig.save(`test1`, {});
            await pluginConfig.save(`test2`, {});
            await pluginConfig.save(`test3`, {});
        });

        it(`Should return existing plugin configs with valid json`, async () => {
            const configObjs = await pluginConfig.getAllPluginConfigObjects();
            expect(configObjs.length).to.eql(3);
        });

        it(`Should NOT return plugins configs with invalid json`, async () => {
            const pluginPath = fileUtil.getPluginConfigPath("test4");
            await fsPromises.writeFile(pluginPath, `{jackedup: json,,}`);
            const configObjs = await pluginConfig.getAllPluginConfigObjects();
            expect(configObjs.length).to.eql(3);
        });
    });

    after(() => {
        const testDir = fileUtil.getAppBaseDir();
        if (testDir.endsWith(`test`)) sh.rm(`-rf`, testDir);
    });
});