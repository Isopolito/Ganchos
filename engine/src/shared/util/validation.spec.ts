import 'mocha';
import { expect } from 'chai';

import { validationUtil } from '..';

describe('** Validation Util **', () => {
    describe('parseAndValidateJson logic', () => {
        it('Should return false if "jsonString" parameter is not provided', () => {
            const result = validationUtil.parseAndValidateJson(null);
            expect(result).to.be.false;
        });

        it('Should return object if representing "jsonConfig" parameter if the JSON is valid', () => {
            const result = validationUtil.parseAndValidateJson('{"foo": 1}');
            expect(result.foo).to.be.equal(1);
        });

        it('Should return false if "shouldStripComments" is false and comments are included in json', () => {
            const result = validationUtil.parseAndValidateJson(`{
                // this is a comment
                "foo": 1
            }`);

            expect(result).to.be.false;
        });

        it('Should return object back if "shouldStripComments" is true and comments are included in json', () => {
            const result = validationUtil.parseAndValidateJson(`{
                // this is a comment
                "foo": 1
            }`, true);

            expect(result.foo).to.be.equal(1);
        });
    });
});