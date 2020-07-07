import { write as writeMessage } from './genericLogger';
import { makeTimeStamp } from '../util/logs';
import * as generalConstants from '../constants/names';

/*========================================================================================*/

const write = (severity: SeverityEnum, pluginName: string, category: string, areaInPlugin: string, message: string): Promise<void> => {
  const logMessage: PluginLogMessage = {
    PluginName: pluginName,
    TimeStamp: makeTimeStamp(),
    Severity: severity,
    Category: category,
    AreaInPlugin: areaInPlugin,
    Message: message,
  };

  return writeMessage(generalConstants.Plugin, JSON.stringify(logMessage));
}

/*========================================================================================*/

export {
  write
}