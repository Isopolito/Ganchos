import { generalLogger, SeverityEnum } from 'ganchos-shared'
import { beginScheduleMonitoring } from './pluginExecution/pluginScheduleRunner';
import { run as runEventListener, stop as stopEventListener } from './eventListener/eventListener'

(async () => {
    try {
        process.on('SIGINT', async () => {
            stopEventListener();
            await generalLogger.write(SeverityEnum.info, "main", "SIGINT - Application is shutting down", true);
        });

        const tasks = [];

        tasks.push(runEventListener());
        await generalLogger.write(SeverityEnum.info, "main", "Started Event Listener", true);

        tasks.push(beginScheduleMonitoring());
        await generalLogger.write(SeverityEnum.info, "main", "Begin monitoring run schedules", true);

        await Promise.all(tasks);
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, "main", `Error from main: ${e}`, true);
        process.exit(1);
    }
})();