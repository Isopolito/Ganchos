import { write as writeMessage } from './genericLogger';
import { makeTimeStamp } from '../util/logs';
import * as generalConstants from '../constants/names';
import { SeverityEnum } from './SeverityEnum';
import { PluginLogMessage } from './PluginLogMessage';

/*========================================================================================*/

const write = (severity: SeverityEnum, pluginName: string, category: string, areaInPlugin: string, message: string): Promise<void> => {
  const logMessage: PluginLogMessage = {
    pluginName: pluginName,
    timeStamp: makeTimeStamp(),
    severity: severity,
    category: category,
    areaInPlugin: areaInPlugin,
    message: message,
  };

  return writeMessage(generalConstants.Plugin, JSON.stringify(logMessage));
}

/*========================================================================================*/

export {
  write
}