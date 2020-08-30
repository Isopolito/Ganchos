import 'mocha';
import { expect } from 'chai';
import * as path from 'path';
import { promises as fsPromises } from 'fs';
import * as os from 'os';
import { Watcher } from './watcher';
import { fileUtil, systemUtil } from '..';
import * as generalLogger from '../logging/generalLogger';

let configObj = {};
let watcher: Watcher;
const tempFilePath: string = path.join(os.tmpdir(), 'watchedFile');

describe('** Watcher **', async () => {

    beforeEach(async () => {
        configObj = { foo: 'bar' };
        fileUtil.doesPathExist(tempFilePath) && await fsPromises.unlink(tempFilePath);
        await fsPromises.writeFile(tempFilePath, JSON.stringify(configObj));
        watcher = new Watcher(tempFilePath, async () => configObj, generalLogger.write);
    });

    describe('When file (with JSON as contents) on disk has changed', () => {
        it('Property differences should be reported--via watcher callback--between what is on disk verse file', async () => {
            watcher.beginWatch(async (event, filePath, diffs) => {
                expect(diffs).to.be.eql(['foo']);
            })

            await fsPromises.writeFile(tempFilePath, JSON.stringify({ foo: 'baz'}));
            await systemUtil.waitInSeconds(0.3);
        });
    });

    afterEach(async () => {
        watcher && await watcher.endWatch();
        fileUtil.doesPathExist(tempFilePath) && await fsPromises.unlink(tempFilePath);
    });
});