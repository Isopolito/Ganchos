import 'mocha';
import { expect } from 'chai';

import { systemUtil } from '..';

describe('** System Util **', () => {
    describe(`a call to ${systemUtil.isObjectEmpty.name}`, () => {
        it('should return TRUE when object has no properties', () => {
            const result = systemUtil.isObjectEmpty({});

            expect(result).to.be.true;
        });

        it('should return FALSE when object has properties', () => {
            const result = systemUtil.isObjectEmpty({foo: 'bar'});

            expect(result).to.be.false;
        });

        it('should return TRUE when object is null', () => {
            const result = systemUtil.isObjectEmpty(null);

            expect(result).to.be.true;
        });
    });

    describe(`a call to ${systemUtil.deepClone.name}`, () => {
        it('should return an object with identical shape/values to parameter', () => {
            const obj = { foo: 'bar', num: 123 };
            const result = systemUtil.deepClone(obj);

            expect(result).to.be.eql(obj);
        });

        it('should return an object with different memory address', () => {
            const obj = { foo: 'bar', num: 123 };
            const result = systemUtil.deepClone(obj);

            expect(result).to.not.be.equal(obj);
        });

        it('should return null if parameter is null', () => {
            const result = systemUtil.deepClone(null);

            expect(result).to.be.null;
        });
    });

    describe(`A call to ${systemUtil.flattenAndDistinct.name}`, () => {
        it('should return empty array if multi-dimensional array parameter is NULL', () => {
            const result = systemUtil.flattenAndDistinct(null as any);

            expect(result).to.be.eql([]);
        });
        
        it('should return empty array if multi-dimensional array parameter is EMPTY', () => {
            const result = systemUtil.flattenAndDistinct(null as any);

            expect(result).to.be.eql([]);
        });

        it('should flatten multi-dimensional arrays properly into single layer', () => {
            const arrays = [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9],
            ];

            const result = systemUtil.flattenAndDistinct(arrays);

            expect(result).to.be.eql([1,2,3,4,5,6,7,8,9]);
        });

        it('should remove duplicates', () => {
            const arrays = [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9],
                [6, 4, 1],
            ];

            const result = systemUtil.flattenAndDistinct(arrays);

            expect(result).to.be.eql([1,2,3,4,5,6,7,8,9]);
        });
    });
});