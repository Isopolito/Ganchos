import { generalLogger, SeverityEnum } from 'ganchas-shared'

(async () => {
  try {
    process.on('SIGINT', () => {
      // TODO: Do clean up
      generalLogger.write(SeverityEnum.Info, "main", "Application has been shut down", true);
    });

    generalLogger.write(SeverityEnum.Info, "main", "Started Event Listener", true);
  } catch (e) {
    generalLogger.write(SeverityEnum.Error, "main", "Started Event Listener", true);
    process.exit(1);
  }
})();