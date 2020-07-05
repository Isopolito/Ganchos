import * as path from 'path';
import { promises as fs } from 'fs';
import * as properLockFile from 'proper-lockfile';
import * as generalConstants from '../contracts/constants/general';
import * as os from 'os';

import { doesPathExist, touch } from '../common/files';

/*========================================================================================*/

interface GeneralConfig {
  lastUpdatedTimeStamp: Number;
  watchPaths: Array<string>;
  heartBeatPollIntervalInSeconds: Number;
}

/*========================================================================================*/

// Keep the most up to date config here in memory for easy access
let inMemoryConfig: GeneralConfig;

/*========================================================================================*/

const getConfigPath = (): string => path.join(os.homedir(), generalConstants.AppDirName, 'config', 'general');

const isConfigInMemoryMostRecent = async (configPath: string): Promise<Boolean> => {
  if (!inMemoryConfig) return false;

  const stats = await fs.stat(configPath);

  // True if inMemoryConfig was updated after the config file was last written to disk
  return stats.mtime.getTime() <= inMemoryConfig.lastUpdatedTimeStamp;
}

const getAndCreateDefaultIfNotExist = async (): Promise<GeneralConfig|null> => {
  const configPath = getConfigPath();
  if (doesPathExist(configPath)) return await get();

  const config: GeneralConfig = {
    heartBeatPollIntervalInSeconds: 5,
    watchPaths: [],
    lastUpdatedTimeStamp: 0,
  }; 

  save(config);
  return config;
}

const get = async (): Promise<GeneralConfig|null> => {
  const configPath = getConfigPath();
  if (!doesPathExist(configPath)) return null;

  if (await isConfigInMemoryMostRecent(configPath)) return inMemoryConfig;

  let rawData = await fs.readFile(configPath);
  let config: GeneralConfig = JSON.parse(rawData.toString());  
  
  inMemoryConfig = config;
  inMemoryConfig.lastUpdatedTimeStamp = Date.now();

  return config;
}

const save = async (config: GeneralConfig) => {
  if (config === null) return null;

  try {
    const configPath = getConfigPath();
    doesPathExist(configPath) || await touch(configPath);

    const release = await properLockFile.lock(configPath);
    await fs.writeFile(configPath, JSON.stringify(config));
    release();

    inMemoryConfig = config;
    inMemoryConfig.lastUpdatedTimeStamp = Date.now();
  } catch (e) {
    // TODO: log
    console.log(`Error saving log file ${e}`);
  }
}

/*========================================================================================*/

export {
  save,
  get,
  getAndCreateDefaultIfNotExist,
};
