import { write as writeMessage } from './genericLogger';
import { makeTimeStamp } from '../util/logs';
import * as constants from '../constants/names';
import { SeverityEnum } from './SeverityEnum';
import { GeneralLogMessage } from './GeneralLogMessage';

/*========================================================================================*/

const write = (severity: SeverityEnum, area: string, message: string): Promise<void> => {
  const logMessage: GeneralLogMessage = {
    TimeStamp: makeTimeStamp(),
    Severity: severity,
    Area: area,
    Message: message,
  };

  return writeMessage(constants.General, JSON.stringify(logMessage));
}

/*========================================================================================*/

export {
  write
}