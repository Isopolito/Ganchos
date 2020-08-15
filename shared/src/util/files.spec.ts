import 'mocha';
import { expect } from 'chai';
import * as sh from 'shelljs';
import * as os from 'os';
import * as path from 'path';

import { fileUtil } from '..';

describe('** File Util **', () => {
    describe('When running tests', () => {
        it('config directory should be test specific', () => {
            const result = fileUtil.getAppBaseDir();
            expect(result).to.contain('.ganchos-test');
        });
    });

    describe(`When calling ${fileUtil.interpolateHomeTilde.name} to replace "~" with user home path`, () => {
        it('should return an empty string the "path" argument is not provided', () => {
            const interpolatedPath = fileUtil.interpolateHomeTilde('');

            expect(interpolatedPath).to.be.equal('');
        });
        
        it('should interpolate the path when path is a single string', () => {
            const pathWithTilde = path.join('~', 'foo', 'bar');

            const interpolatedPath = fileUtil.interpolateHomeTilde(pathWithTilde);
            const baseLine = path.join(os.homedir(), 'foo', 'bar');

            expect(interpolatedPath).to.be.equal(baseLine);
        });

        it('should interpolate each individual path when path is an array', () => {
            const pathsWithTilde = [
                path.join('~', 'foo', 'bar'),
                path.join('~', 'baz', 'mu'),
            ];

            const interpolatedPath = fileUtil.interpolateHomeTilde(pathsWithTilde);

            const baseLine = [
                path.join(os.homedir(), 'foo', 'bar'),
                path.join(os.homedir(), 'baz', 'mu'),
            ];

            expect(interpolatedPath).to.be.eql(baseLine);
        });
    });

    describe('When removing a file extension', () => {
        it('a file name should not have an extension', () => {
            const fileName = 'foobar.txt';
            const fileNameWithNoExtension = fileUtil.removeExtension(fileName);
            expect(fileNameWithNoExtension).to.equal('foobar');
        });

        it('a multi-directory path should only return file name with no extension', () => {
            const fileName = '/home/username/foobar.txt';
            const fileNameWithNoExtension = fileUtil.removeExtension(fileName);
            expect(fileNameWithNoExtension).to.equal('foobar');
        });

        it('empty file path should return empty string', () => {
            const fileName = null;
            const fileNameWithNoExtension = fileUtil.removeExtension(fileName as any);
            expect(fileNameWithNoExtension).to.equal('');
        });
    });

    describe('When recursively getting all files in a directory', () => {
        let pathToSearchOne: string;
        let pathToSearchTwo: string;
        let fileArrayOne: string[];
        let fileArrayTwo: string[];

        before(() => {
            pathToSearchOne = path.join(sh.tempdir(), 'ganchos_files_test_one');
            sh.mkdir(pathToSearchOne);

            fileArrayOne = [
                path.join(pathToSearchOne, 'fileOne.txt'),
                path.join(pathToSearchOne, 'fileTwo.txt'),
                path.join(pathToSearchOne, 'fileThree.js')
            ];
            sh.touch(fileArrayOne);

            pathToSearchTwo = path.join(sh.tempdir(), 'ganchos_files_test_two');
            sh.mkdir(pathToSearchTwo);

            fileArrayTwo = [
                path.join(pathToSearchTwo, 'fileFour.txt'),
                path.join(pathToSearchTwo, 'fileFive.txt'),
                path.join(pathToSearchTwo, 'fileSix.js')
            ];
            sh.touch(fileArrayTwo);
        });

        it('should return all files in a single directory when the extension filter parameter is not provided', async () => {
            const fileNames = await fileUtil.getAllFiles([pathToSearchOne]);
            expect(fileNames).to.have.lengthOf(fileArrayOne.length);
            expect(fileNames).to.have.all.members(fileArrayOne);
        });

        it('should return all files in multiple directories when the extension filter parameter is not provided', async () => {
            const fileNames = await fileUtil.getAllFiles([pathToSearchOne, pathToSearchTwo]);

            expect(fileNames).to.have.lengthOf(fileArrayOne.length + fileArrayTwo.length);
            expect(fileNames).to.have.all.members(fileArrayOne.concat(fileArrayTwo));
        });

        it('should return only .js files in a single directory when using extension filter', async () => {
            const fileNames = await fileUtil.getAllFiles([pathToSearchOne], '.js');

            expect(fileNames).to.have.lengthOf(1);
            expect(fileNames).to.have.all.members([path.join(pathToSearchOne, 'fileThree.js')]);
        });

        it('should return only .js files in multiple directories when using extension filter', async () => {
            const fileNames = await fileUtil.getAllFiles([pathToSearchOne, pathToSearchTwo], '.js');

            expect(fileNames).to.have.lengthOf(2);
            expect(fileNames).to.have.all.members([path.join(pathToSearchOne, 'fileThree.js'), path.join(pathToSearchTwo, 'fileSix.js')]);
        });

        after(() => {
            sh.rm('-rf', pathToSearchOne, pathToSearchTwo);
        });
    });
});