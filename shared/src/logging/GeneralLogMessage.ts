// Each line in log file will be one of these serliazed as JSON
interface GeneralLogMessage {
  TimeStamp: string;
  Severity: SeverityEnum;
  Area?: string;
  Message: string;
}