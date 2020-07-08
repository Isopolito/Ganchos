import { generalLogger, SeverityEnum } from 'ganchas-shared'
import { run, stop } from './EventListener/eventListener'

(async () => {
	try {
		process.on('SIGINT', async () => {
			stop();
			await generalLogger.write(SeverityEnum.Info, "main", "SIGINT - Application will shut down", true);
		});

		await generalLogger.write(SeverityEnum.Info, "main", "Started Event Listener", true);
		await run();
	} catch (e) {
		await generalLogger.write(SeverityEnum.Error, "main", `Error from main: ${e}`, true);
		process.exit(1);
	}
})();