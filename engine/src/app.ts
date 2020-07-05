import generalConfig from 'ganchas-shared';

try {
	process.on('SIGINT', () => {
		// Log message stating that the app is getting shutdown
	});

	//logger.log(logConst.levels.info, 'Engine starting...');
  const config = generalConfig.generalConfig.default.getAndCreateDefaultIfNotExist();
  console.log(JSON.stringify(config));

  debugger;

	// Start up event eventListener
	console.log("Started Event Listener...");
} catch (e) {
	//logger.log(logConst.levels.error, `Fatal error: ${e}`);

	// eslint-disable-next-line no-console
	console.log(`Fatal Error: ${e}`);
	process.exit(1);
}
