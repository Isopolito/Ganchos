import * as fileLogic from './files';
import { expect } from 'chai';
import 'mocha';
import { fileUtil } from '..';

describe('First test', () => {
    it('should return true', () => {
        const result = fileUtil.getAppBaseDir();
        expect(result).to.contain('.ganchos-test');
    });
});