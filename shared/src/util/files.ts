import * as os from 'os';
import * as path from 'path';
import * as sh from 'shelljs';
import recursive from 'recursive-readdir';

import * as generalConstants from '../constants/names';
import * as pathConstants from '../constants/paths';

const touch = (configPath: string): void => {
    if (sh.test('-e', configPath)) return;

    sh.mkdir('-p', path.dirname(configPath));
    sh.touch(configPath);
}

const makeAllDirInPath = (filePath: string): void => {
    sh.mkdir('-p', filePath);
}

const getEnvBasedAppName = (): string => {
    const env = process.env.NODE_ENV || 'dev';
    return env === 'prod' ? generalConstants.AppDir : `${generalConstants.AppDir}-${env}`;
}

const doesPathExist = (pathToCheck: string): boolean => sh.test('-f', pathToCheck) || sh.test('-d', pathToCheck);

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

const getGanchosPluginPath = (appRoot: string|null = null): string => {
    return appRoot
        ? path.join(appRoot, 'dist','plugins', pathConstants.GanchosRelativePluginPath)
        : pathConstants.GanchosRelativePluginPath;
}

const interpolateHomeTilde = (path: string[] | string): string[] | string => {
    if (!path) return '';

    return typeof path === 'string'
        ? path.replace('~', os.homedir())
        : path.map(p => p && p.replace('~', os.homedir()));
}

const isChildPathInParentPath = (parentPath: string, childPaths: string[]): boolean => {
    if (!parentPath || !childPaths || childPaths.length < 1) return false;

    return childPaths.some(c => c.includes(parentPath));
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
    getGanchosPluginPath,
    isChildPathInParentPath,
}
