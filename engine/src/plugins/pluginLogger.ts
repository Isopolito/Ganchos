import { PluginLogMessage } from './PluginLogMessage';

export const writeLog = (logMessage: PluginLogMessage) => console.log(JSON.stringify(logMessage));
