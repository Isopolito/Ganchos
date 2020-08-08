import { write as writeMessage } from './genericLogger';
import { makeTimeStamp } from '../util/logs';
import * as generalConfig from '../config/general';
import * as constants from '../constants/names';
import { SeverityEnum } from './SeverityEnum';
import { GeneralLogFileMessage } from './GeneralLogFileMessage';

/*========================================================================================*/

const write = async (severity: SeverityEnum, area: string, message: string, shouldLogToConsole?: boolean): Promise<void> => {
    if (severity === SeverityEnum.debug) {
        const config = await generalConfig.get();
        if (!config?.enableDebug) return;
    }

	const logMessage: GeneralLogFileMessage = {
		timeStamp: makeTimeStamp(),
		severity: severity,
		area: area,
		message: message,
	};

	shouldLogToConsole && console.log(message);
	return writeMessage(constants.General, JSON.stringify(logMessage));
}

const writeSync = (severity: SeverityEnum, area: string, message: string, shouldLogToConsole?: boolean): void => {
    (async () => { 
        await write(severity, area, message, shouldLogToConsole);
    })();
}

/*========================================================================================*/

export {
	write,
	writeSync,
}