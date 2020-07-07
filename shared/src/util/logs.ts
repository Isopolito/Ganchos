import * as path from 'path';
import * as os from 'os';
import * as moment from 'moment';

import * as generalConstants from '../constants/names';

/*========================================================================================*/

const getFormattedDateForLogs = (): string => moment(new Date()).format("YYYYMMDD");

const makeLogFilePath = (name: string): string => path.join(os.homedir(), generalConstants.AppDir, generalConstants.LogDir, `${getFormattedDateForLogs()}-${name}`);

const makeTimeStamp = (timePartOnly?: boolean): string => moment().format(timePartOnly ? "HH:mm:ss" : "MM-DD-YYYY HH:mm:ss");

/*========================================================================================*/

export {
  makeLogFilePath,
  makeTimeStamp,
}
