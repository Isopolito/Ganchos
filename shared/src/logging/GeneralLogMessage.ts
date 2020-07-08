import { SeverityEnum } from './SeverityEnum';

// Each line in log file will be one of these serliazed as JSON
export interface GeneralLogMessage {
  TimeStamp: string;
  Severity: SeverityEnum;
  Area?: string;
  Message: string;
}