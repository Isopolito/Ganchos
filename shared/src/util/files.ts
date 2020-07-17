import { promises as fs } from 'fs'
import * as sh from 'shelljs';
import * as path from 'path';
import * as os from 'os';

import * as generalConstants from '../constants/names';

const touch = async (configPath: string) => {
    sh.mkdir('-p', path.dirname(configPath));
    sh.touch(configPath);
}

const doesPathExist = async (pathToCheck: string) => sh.test('-f', pathToCheck) || sh.test('-d', pathToCheck);

const getAllFiles = async (paths: string[], fileNameEndsWith?: string): Promise<string[]> => {
    const files = [] as string[];

    for (const path of paths) {
        if (!doesPathExist(path)) continue;

        for (const fileName of await fs.readdir(path)) {
            if (fileNameEndsWith && !fileName.endsWith(fileNameEndsWith)) continue;
            files.push(fileName);
        }
    }

    return files;
}

const removeExtension = (fileName: string): string => fileName ? path.parse(fileName).name : '';

const getAppBaseDir = (): string => path.join(os.homedir(), generalConstants.AppDir);

const getConfigPath = (): string => path.join(os.homedir(), generalConstants.AppDir, generalConstants.Config, generalConstants.General);

const getPluginConfigPath = (pluginName: string): string => {
    return path.join(os.homedir(), generalConstants.AppDir, generalConstants.Config,
        generalConstants.Plugin, pluginName);
}

export {
    removeExtension,
    touch,
    getConfigPath,
    getAppBaseDir,
    getPluginConfigPath,
    doesPathExist,
    getAllFiles,
}
