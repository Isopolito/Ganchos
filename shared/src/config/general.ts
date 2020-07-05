import * as path from 'path';
import * as fs from 'fs';
import * as lockFile from 'lockfile';
import * as generalConstants from '../contracts/constants/general';

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

const getConfigPath = (): string => path.join(generalConstants.AppDirName, '.config', 'general');

const configInMemoryIsMostRecent = (path: string): Boolean  => {
  if (!inMemoryConfig) return false;

  const stats = fs.statSync(path);

  // True if inMemoryConfig was updated after the config file was last written to disk
  return stats.mtime.getTime() <= inMemoryConfig.lastUpdatedTimeStamp;
}

const doesConfigAlreadyExist = (path: string) => path && fs.existsSync(path);
const configDoesNotAlreadyExist = (path: string) => !doesConfigAlreadyExist(path);

const getAndCreateDefaultIfNotExist = (): GeneralConfig | null => {
  const path = getConfigPath();
  if (doesConfigAlreadyExist(path)) return get();

  const config: GeneralConfig = {
    heartBeatPollIntervalInSeconds: 5,
    watchPaths: [],
    lastUpdatedTimeStamp: 0,
  }; 

  save(config);
  return config;
}

const get = (): GeneralConfig | null => {
  const path = getConfigPath();
  if (configDoesNotAlreadyExist(path)) return null;

  if (configInMemoryIsMostRecent(path)) return inMemoryConfig;

  let rawData = fs.readFileSync(path);
  let config: GeneralConfig = JSON.parse(rawData.toString());  
  
  inMemoryConfig = config;
  inMemoryConfig.lastUpdatedTimeStamp = Date.now();

  return config;
}

const save = (config: GeneralConfig) => {
  if (config === null) return null;
  const path = getConfigPath();

  lockFile.lock(path, err => {
    // If the err happens, then it failed to acquire a lock.
    if (err) {
      // TODO: Log for real
      console.log(`An error occurred locking general config file: ${err}`)
      return;
    }
   
    fs.writeFileSync(path, JSON.stringify(config));

    // TODO: Log for real instead of using console 
    lockFile.unlock(path, err => console.log(`An error occurred unlocking general config file: ${err}`));
  });

  inMemoryConfig = config;
  inMemoryConfig.lastUpdatedTimeStamp = Date.now();
}

/*========================================================================================*/

export {
  save,
  get,
  getAndCreateDefaultIfNotExist,
};
