import { SeverityEnum } from './SeverityEnum'

// Each line in log file will be one of these serliazed as JSON
export interface PluginLogMessage {
  TimeStamp: string;
  Severity: SeverityEnum;
  PluginName: string,
  Category?: string;
  AreaInPlugin?: string;
  Message: string;
}