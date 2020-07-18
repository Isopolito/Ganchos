import { write as writeMessage } from './genericLogger';
import { makeTimeStamp } from '../util/logs';
import * as generalConstants from '../constants/names';
import { SeverityEnum } from './SeverityEnum';
import { PluginLogFileMessage } from './PluginLogFileMessage';

/*========================================================================================*/

const write = (severity: SeverityEnum, pluginName: string, areaInPlugin: string, message: string): Promise<void> => {
  const logMessage: PluginLogFileMessage = {
    pluginName: pluginName,
    timeStamp: makeTimeStamp(),
    severity: severity,
    areaInPlugin: areaInPlugin,
    message: message,
  };

  return writeMessage(generalConstants.Plugin, JSON.stringify(logMessage));
}

const writeSync = (severity: SeverityEnum, pluginName: string, areaInPlugin: string, message: string): void => {
    (async () => {
        write(severity, pluginName, areaInPlugin, message);
    })();

}

/*========================================================================================*/

export {
    write,
    writeSync,
}