import * as sh from 'shelljs';
import * as path from 'path';
import * as os from 'os';
import recursive from 'recursive-readdir';

import * as generalConstants from '../constants/names';

const touch = async (configPath: string) => {
    sh.mkdir('-p', path.dirname(configPath));
    sh.touch(configPath);
}

const getEnvBasedAppName = (): string => {
    const env = process.env.NODE_ENV || 'dev'
    return env === 'prod' ? generalConstants.AppDir : `${generalConstants.AppDir}-${env}`;
}

const doesPathExist = (pathToCheck: string) => sh.test('-f', pathToCheck) || sh.test('-d', pathToCheck);

const getAllFiles = async (paths: string[], fileNameEndsWith?: string): Promise<string[]> => {
    const files = [] as string[];

    for (const filePath of paths) {
        if (!doesPathExist(filePath)) continue;

        for (const fileName of await recursive(filePath)) {
            if (fileNameEndsWith && !fileName.endsWith(fileNameEndsWith)) continue;
            files.push(fileName);
        }
    }

    return files;
}

const removeExtension = (fileName: string): string => fileName ? path.parse(fileName).name : '';

const getAppBaseDir = (): string => path.join(os.homedir(), getEnvBasedAppName());

const getConfigPath = (): string => path.join(os.homedir(), getEnvBasedAppName(), generalConstants.Config, generalConstants.General);

const getPluginConfigPath = (pluginName: string): string => {
    return path.join(os.homedir(), getEnvBasedAppName(), generalConstants.Config, generalConstants.Plugin, pluginName);
}

const getPluginConfigBasePath = (): string => {
    return path.join(os.homedir(), getEnvBasedAppName(), generalConstants.Config, generalConstants.Plugin);
}

export {
    removeExtension,
    touch,
    getConfigPath,
    getAppBaseDir,
    getPluginConfigPath,
    getPluginConfigBasePath,
    doesPathExist,
    getAllFiles,
}
