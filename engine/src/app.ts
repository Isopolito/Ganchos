import { generalLogger, SeverityEnum } from 'ganchos-shared'
import { beginScheduleMonitoring } from './pluginExecution/pluginScheduleRunner';
import { run as runFsEventListener, stop as stopFsEventListener } from './eventListeners/fsEventListener'

const logArea = "main";

(async () => {
    try {
        process.on('SIGINT', async () => {
            stopFsEventListener();
            await generalLogger.write(SeverityEnum.info, logArea, "SIGINT - Application is shutting down", true);
        });

        const tasks = [];

        tasks.push(runFsEventListener());
        await generalLogger.write(SeverityEnum.info, logArea, "Started File System Event Listener", true);

        tasks.push(beginScheduleMonitoring());
        await generalLogger.write(SeverityEnum.info, logArea, "Begin plugin runtime schedules", true);

        await Promise.all(tasks);
    } catch (e) {
        await generalLogger.write(SeverityEnum.error, logArea, `Error from main: ${e}`, true);
        process.exit(1);
    }
})();