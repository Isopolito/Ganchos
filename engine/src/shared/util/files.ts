import * as os from 'os';
import * as path from 'path';
import * as sh from 'shelljs';
import recursive from 'recursive-readdir';

import * as generalConstants from '../constants/names';

const touch = (configPath: string): void => {
    if (sh.test('-e', configPath)) return;

    sh.mkdir('-p', path.dirname(configPath));
    sh.touch(configPath);
}

const makeAllDirInPath = (filePath: string): void => {
    sh.mkdir('-p', filePath);
}

const getEnvBasedAppName = (): string => {
    const env = process.env.NODE_ENV || 'prod';
    return env === 'prod' ? generalConstants.AppDir : `${generalConstants.AppDir}-${env}`;
}

const doesPathExist = (pathToCheck: string): boolean => {
    const interpolatedPath = interpolateHomeTilde(pathToCheck) as string;
    if (!interpolatedPath) return false;

    return interpolatedPath && sh.test('-f', interpolatedPath) || sh.test('-d', interpolatedPath);
}

const getAllFiles = async (paths: string[], fileNameEndsWith?: string): Promise<string[]> => {
    const files:string[] = [];

    for (let filePath of paths) {
        filePath = interpolateHomeTilde(filePath) as string;
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

const getGeneralConfigPath = (): string => path.join(os.homedir(), getEnvBasedAppName(), generalConstants.Config, generalConstants.General);

const getLogBasePath = (): string => path.join(getAppBaseDir(), generalConstants.LogDir);

const getPluginConfigPath = (pluginName: string): string => {
    return path.join(os.homedir(), getEnvBasedAppName(), generalConstants.Config, generalConstants.Plugin, pluginName);
}

const getPluginConfigBasePath = (): string => {
    return path.join(os.homedir(), getEnvBasedAppName(), generalConstants.Config, generalConstants.Plugin);
}

const interpolateHomeTilde = (path: string[] | string): string[] | string => {
    if (!path) return '';

    return typeof path === 'string'
        ? path.replace('~', os.homedir())
        : path.map(p => p && p.replace('~', os.homedir()));
}

const isDirectoryInPath = (parentPath: string, childPaths: string[]): boolean => {
    if (!parentPath || !childPaths || childPaths.length < 1) return false;

    return childPaths.some(c => {
        const interpolatedPath = interpolateHomeTilde(c) as string;
        return parentPath.includes(interpolatedPath);
    });
}

export {
    removeExtension,
    touch,
    makeAllDirInPath,
    getGeneralConfigPath,
    getAppBaseDir,
    getPluginConfigPath,
    getPluginConfigBasePath,
    doesPathExist,
    getAllFiles,
    getLogBasePath,
    interpolateHomeTilde,
    isDirectoryInPath,
}
