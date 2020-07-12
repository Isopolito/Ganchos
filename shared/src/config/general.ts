import { promises as fs } from 'fs';
import * as properLockFile from 'proper-lockfile';

import { getConfigPath, doesPathExist, touch } from '../util/files';
import { generalLogger, SeverityEnum } from '../';

/*========================================================================================*/

interface GeneralConfig {
	lastUpdatedTimeStamp: Number;
	watchPaths: string[];
	heartBeatPollIntervalInSeconds: Number;
}

/*========================================================================================*/

// Keep the most up to date config here in memory for easy access
let inMemoryConfig: GeneralConfig;

/*========================================================================================*/

const isConfigInMemoryMostRecent = async (configPath: string): Promise<Boolean> => {
	if (!inMemoryConfig) return false;

	const stats = await fs.stat(configPath);

	// True if inMemoryConfig was updated after the config file was last written to disk
	return stats.mtime.getTime() <= inMemoryConfig.lastUpdatedTimeStamp;
}

const getAndCreateDefaultIfNotExist = async (): Promise<GeneralConfig | null> => {
	const configPath = getConfigPath();
	if (doesPathExist(configPath)) return await get();

	const config: GeneralConfig = {
		heartBeatPollIntervalInSeconds: 5,
		watchPaths: [],
		lastUpdatedTimeStamp: 0,
	};

	save(config);
	//return config;
	return config;
}

const get = async (): Promise<GeneralConfig | null> => {
	const configPath = getConfigPath();
	if (!doesPathExist(configPath)) return null;

	if (await isConfigInMemoryMostRecent(configPath)) return inMemoryConfig;

	let rawData = await fs.readFile(configPath);
	try {
		let config: GeneralConfig = JSON.parse(rawData.toString());

		inMemoryConfig = config;
		inMemoryConfig.lastUpdatedTimeStamp = Date.now();

		return config;
	} catch (e) {
		await generalLogger.write(SeverityEnum.critical, "general config", `Error. Can't parse general config json: ${e}`, true);
		return null;
	}
}

const save = async (config: GeneralConfig) => {
	if (config === null) return;

	try {
		const configPath = getConfigPath();
		doesPathExist(configPath) || await touch(configPath);

		const release = await properLockFile.lock(configPath);
		await fs.writeFile(configPath, JSON.stringify(config, null, 4));
		release();

		inMemoryConfig = config;
		inMemoryConfig.lastUpdatedTimeStamp = Date.now();
	} catch (e) {
		await generalLogger.write(SeverityEnum.error, "general config - save", `${e}`, true);
	}
}

/*========================================================================================*/

export {
	save,
	get,
	getAndCreateDefaultIfNotExist,
};
