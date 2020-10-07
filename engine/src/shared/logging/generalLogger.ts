import queue from 'queue';
import { write as writeMessage } from './genericLogger';
import { makeTimeStamp } from '../util/logs';
import * as constants from '../constants/names';
import { SeverityEnum } from './SeverityEnum';
import { GeneralLogFileMessage } from './GeneralLogFileMessage';

/*========================================================================================*/

const logMessageQueue = queue({ results: [], concurrency: 1, autostart: true, timeout: 5000 });

/*========================================================================================*/

const write = (severity: SeverityEnum, area: string, message: string, shouldLogToConsole?: boolean): void => {
    if (severity === SeverityEnum.debug && !process.env.DEBUG) return;

    const logMessage: GeneralLogFileMessage = {
        timeStamp: makeTimeStamp(),
        severity: severity,
        area: area,
        message: message,
    };

    shouldLogToConsole && console.log(message);
    logMessageQueue.push(() => writeMessage(constants.General, JSON.stringify(logMessage)));
}

/*========================================================================================*/

export {
    write,
}