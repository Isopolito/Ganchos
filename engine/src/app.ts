import { generalLogger, SeverityEnum } from 'ganchos-shared'
import { beginScheduleMonitoring } from './pluginExecution/pluginScheduleRunner';
import { run as runEventListener, stop as stopEventListener } from './eventListener/eventListener'

const logArea = "main";

(async () => {
    try {
        process.on('SIGINT', async () => {
            stopEventListener();
            await generalLogger.write(SeverityEnum.info, logArea, "SIGINT - Application is shutting down", true);
        });

        const tasks = [];

        tasks.push(runEventListener());
        await generalLogger.write(SeverityEnum.info, logArea, "Started Event Listener", true);

        tasks.push(beginScheduleMonitoring());
        await generalLogger.write(SeverityEnum.info, logArea, "Begin monitoring run schedules", true);

        await Promise.all(tasks);
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, logArea, `Error from main: ${e}`, true);
        process.exit(1);
    }
})();