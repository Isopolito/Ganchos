import path from 'path';
import fs from 'file-system';
import lockFile from 'lockfile';
import constants from 'ganchas-contracts';

/*========================================================================================*/

interface GeneralConfig {
  lastUpdatedTimeStamp: Number;
  watchPaths: Array<String>;
  heartBeatPollIntervalInSeconds: Number;
}

/*========================================================================================*/

// Keep the most up to date config here in memory for easy access
let inMemoryConfig: GeneralConfig = null;

/*========================================================================================*/

const getConfigPath = (): String => path.join(constants.General.AppDirName, '.config', 'general');

const configInMemoryIsMostRecent = (path: String): Boolean  => {
  if (!inMemoryConfig) return false;

  const stats = fs.statSync(path);

  // True if inMemoryConfig was updated after the config file was last written to disk
  return stats.mtime.getTime() <= inMemoryConfig.lastUpdatedTimeStamp;
}

const get = (): GeneralConfig => {
  const path = getConfigPath();
  if (!fs.existsSync(path)) return null;

  if (configInMemoryIsMostRecent(path)) return inMemoryConfig;

  let rawdata = fs.readFileSync(path);
  let config: GeneralConfig = JSON.parse(rawdata);  
  
  inMemoryConfig = config;
  inMemoryConfig.lastUpdatedTimeStamp = Date.now();

  return config;
}

const save = (config: GeneralConfig) => {
  if (config === null) return;
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

export default {
  get,
  save,
}