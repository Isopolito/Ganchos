import * as path from 'path';
import { promises as fs } from 'fs';
import * as properLockFile from 'proper-lockfile';
import * as generalConstants from '../contracts/constants/general';
import * as shell from 'shelljs';
import * as os from 'os';

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

const doesConfigFileExist = async (configPath: string) => {
  if (!configPath) return false;

  try { await fs.stat(configPath); }
  catch (e) { if (e.code === 'ENOENT') return false; }

  return true;
}

const configFileDoesNotExist = async (configPath: string) => !await doesConfigFileExist(configPath);

const getAndCreateDefaultIfNotExist = async (): Promise<GeneralConfig|null> => {
  const configPath = getConfigPath();
  if (await doesConfigFileExist(configPath)) return await get();

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
  if (await configFileDoesNotExist(configPath)) return null;

  if (await isConfigInMemoryMostRecent(configPath)) return inMemoryConfig;

  let rawData = await fs.readFile(configPath);
  let config: GeneralConfig = JSON.parse(rawData.toString());  
  
  inMemoryConfig = config;
  inMemoryConfig.lastUpdatedTimeStamp = Date.now();

  return config;
}

const touchFile = async (configPath: string) => {
  shell.mkdir('-p', path.dirname(configPath));
  shell.touch(configPath);
}

const save = async (config: GeneralConfig) => {
  if (config === null) return null;
  const configPath = getConfigPath();

  try {
    await configFileDoesNotExist(configPath) && await touchFile(configPath);

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
