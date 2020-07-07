import { write as writeMessage } from './genericLogger';
import { makeTimeStamp } from '../util/logs';
import * as generalConstants from '../constants/names';

/*========================================================================================*/

const write = (severity: SeverityEnum, area: string, message: string): Promise<void> => {
  const logMessage: GeneralLogMessage = {
    TimeStamp: makeTimeStamp(),
    Severity: severity,
    Area: area,
    Message: message,
  };

  return writeMessage(generalConstants.General, JSON.stringify(logMessage));
}

/*========================================================================================*/

export {
  write
}