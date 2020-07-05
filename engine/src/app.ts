import { generalConfig } from 'ganchas-shared'

(async () => {
  try {
    process.on('SIGINT', () => {
      // Log message stating that the app is getting shutdown
    });

    //logger.log(logConst.levels.info, 'Engine starting...');
    const config = await generalConfig.getAndCreateDefaultIfNotExist();
    console.log(JSON.stringify(config));

    console.log("Started Event Listener...");
  } catch (e) {
    console.log(`Fatal Error: ${e}`);
    process.exit(1);
  }
})();