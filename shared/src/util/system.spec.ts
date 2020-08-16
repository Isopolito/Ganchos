import 'mocha';
import { expect } from 'chai';

import { systemUtil } from '..';

describe('** System Util **', () => {
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

            expect(result).to.be.eql([1,1,2,3,4,5,6,7,8,9]);
        });
    });
});