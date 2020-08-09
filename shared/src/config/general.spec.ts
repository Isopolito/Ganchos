import * as fileLogic from '../util/files';
import { expect } from 'chai';
import 'mocha';
import { fileUtil } from '..';

//before('Do something first', () => {
//});

describe('After saving a general config', () => {
    it('a "get" call should return the same config object', () => {
        const result = fileUtil.getAppBaseDir();
        expect(result).to.contain('.ganchos-test');
    });
});