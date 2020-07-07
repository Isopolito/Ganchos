import { generalLogger, generalConfig, SeverityEnum } from 'ganchas-shared'

(async () => {
  try {
    process.on('SIGINT', () => {
      generalLogger.write(SeverityEnum.Info, "main", "Application has been shut down");
      console.log("Application has been shutdown")
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