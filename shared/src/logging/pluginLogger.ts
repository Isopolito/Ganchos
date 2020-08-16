import queue from 'queue';
import { write as writeMessage } from './genericLogger';
import { makeTimeStamp } from '../util/logs';
import * as generalConstants from '../constants/names';
import { SeverityEnum } from './SeverityEnum';
import { PluginLogFileMessage } from './PluginLogFileMessage';

/*========================================================================================*/

const logMessageQueue = queue({ results: [], concurrency: 1, autostart: true, timeout: 5000 });

/*========================================================================================*/

const write = (severity: SeverityEnum, pluginName: string, areaInPlugin: string, message: string): void => {
  const logMessage: PluginLogFileMessage = {
    pluginName: pluginName,
    timeStamp: makeTimeStamp(),
    severity: severity,
    areaInPlugin: areaInPlugin,
    message: message,
  };

  logMessageQueue.push(() => writeMessage(generalConstants.Plugin, JSON.stringify(logMessage)));
}

/*========================================================================================*/

export {
    write,
}