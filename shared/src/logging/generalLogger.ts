import { write as writeMessage } from './genericLogger';
import { makeTimeStamp } from '../util/logs';
import * as constants from '../constants/names';
import { SeverityEnum } from './SeverityEnum';
import { GeneralLogMessage } from './GeneralLogMessage';

/*========================================================================================*/

const write = (severity: SeverityEnum, area: string, message: string, shouldLogToConsole?: boolean): Promise<void> => {
	const logMessage: GeneralLogMessage = {
		timeStamp: makeTimeStamp(),
		severity: severity,
		area: area,
		message: message,
	};

	shouldLogToConsole && console.log(message);
	return writeMessage(constants.General, JSON.stringify(logMessage));
}

/*========================================================================================*/

export {
	write
}