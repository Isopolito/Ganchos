import { spawn, Thread, Worker } from "threads";
import { performance } from 'perf_hooks';
import { validationUtil, generalLogger, pluginLogger, SeverityEnum, pluginConfig } from 'ganchos-shared';

const runPluginAndReschedule = () => {
    // execute run method of plugin
   
    // settimeout this same method to run again for the wait time in plugin config file (or default)
}

const beginScheduleMonitoring = async () => { 
    // Fetch all plugins, filter for ones with RunEveryXMinutes values 

    // Get the intial plugin wait time from plugin config (or default from plugin)

    // Settimeout with the code to run being the runPlugin method
}

export {
    beginScheduleMonitoring,
}
