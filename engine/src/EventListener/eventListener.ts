import chokidar from 'chokidar';
import { fileUtil, generalConfig, generalLogger, SeverityEnum } from 'ganchas-shared';
import { run as runPlugins } from '../Plugins/runPlugins';

/*========================================================================================*/

let watcher;

/*========================================================================================*/

const filterOutInvalidPaths = (paths: Array<string>): Array<string> => {
	return paths.filter(async p => {
		if (fileUtil.doesPathExist(p)) return true;

		await generalLogger.write(SeverityEnum.Error, "event listener", `Watch Path ${p} is not accessible...skipping`);
		return false;
	});
}

const watchPaths = (pathsToWatch: Array<string>) => {
	watcher = chokidar.watch(pathsToWatch, {
		ignored: /(^|[/\\])\../,
		persistent: true,
		usePolling: true,
		ignoreInitial: true,
	});

	watcher.on('all', async (event, filePath) => await runPlugins(event, filePath));
	watcher.on('error', async error => await generalLogger.write(SeverityEnum.Error, "event listener", `Error in watcher: ${error}`));
};

const stop = () => watcher && watcher.close();

const run = async () => {
	try {
		const config = await generalConfig.getAndCreateDefaultIfNotExist();
		const verifiedPaths = filterOutInvalidPaths(config.watchPaths);
		verifiedPaths.length && watchPaths(verifiedPaths);
	} catch (e) {
		await generalLogger.write(SeverityEnum.Error, "event listener", `Error in 'run': ${e}`);
	}
}

/*========================================================================================*/

export {
	run,
	stop,
};
