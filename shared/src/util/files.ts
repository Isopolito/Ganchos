import * as sh from 'shelljs';
import * as path from 'path';
import * as os from 'os';

import * as generalConstants from '../constants/names';

const touch = async (configPath: string) => {
  sh.mkdir('-p', path.dirname(configPath));
  sh.touch(configPath);
}

const doesPathExist = (pathToCheck: string) => sh.test('-f', pathToCheck) || sh.test('-d', pathToCheck);

const getAppBaseDir = (): string => path.join(os.homedir(), generalConstants.AppDir);

const getConfigPath = (): string => path.join(os.homedir(), generalConstants.AppDir, generalConstants.Config, generalConstants.General);

const getPluginConfigPath = (pluginName: string): string => {
    return path.join(os.homedir(),generalConstants.AppDir, generalConstants.Config,
                     generalConstants.Plugin, pluginName);
}

export {
  touch,
  getConfigPath,
  getAppBaseDir,
  getPluginConfigPath,
  doesPathExist,
}
