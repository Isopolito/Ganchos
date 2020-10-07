import * as path from 'path';
import moment from 'moment';
import * as fileUtil from './files';

/*========================================================================================*/

const getFormattedDateForLogs = (): string => moment(new Date()).format("YYYYMMDD");

const makeLogFilePath = (name: string): string => path.join(fileUtil.getLogBasePath(), `${getFormattedDateForLogs()}-${name}`);

const makeTimeStamp = (timePartOnly?: boolean): string => moment().format(timePartOnly ? "HH:mm:ss" : "MM-DD-YYYY HH:mm:ss");

/*========================================================================================*/

export {
  makeLogFilePath,
  makeTimeStamp,
}
