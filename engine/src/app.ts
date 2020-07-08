import { generalLogger, SeverityEnum } from 'ganchas-shared'
import { run, stop } from './eventListener/eventListener'

(async () => {
	try {
		process.on('SIGINT', async () => {
			stop();
			await generalLogger.write(SeverityEnum.info, "main", "SIGINT - Application is shutting down", true);
		});

		await generalLogger.write(SeverityEnum.info, "main", "Started Event Listener", true);
		await run();
	} catch (e) {
		await generalLogger.write(SeverityEnum.error, "main", `Error from main: ${e}`, true);
		process.exit(1);
	}
})();