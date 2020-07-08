import { SeverityEnum } from './SeverityEnum';

// Each line in log file will be one of these serliazed as JSON
export interface GeneralLogMessage {
  timeStamp: string;
  severity: SeverityEnum;
  area?: string;
  message: string;
}