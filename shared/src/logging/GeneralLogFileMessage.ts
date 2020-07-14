import { SeverityEnum } from './SeverityEnum';

// Each line in log file will be one of these serliazed as JSON
export interface GeneralLogFileMessage {
  timeStamp: string;
  severity: SeverityEnum;
  area?: string;
  message: string;
}