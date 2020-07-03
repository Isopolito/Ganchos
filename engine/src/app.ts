
try {
    process.on('SIGINT', () => {
      // Log message stating that the app is getting shutdown
    });

    //logger.log(logConst.levels.info, 'Engine starting...');

    // Start up event eventListener
    console.log("Started Event Listener...");
} catch (e) {
    //logger.log(logConst.levels.error, `Fatal error: ${e}`);

    // eslint-disable-next-line no-console
    console.log(`Fatal Error: ${e}`);
    process.exit(1);
}
