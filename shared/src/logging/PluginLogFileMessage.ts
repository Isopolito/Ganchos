import { SeverityEnum } from './SeverityEnum'

// Each line in log file will be one of these serliazed as JSON
export interface PluginLogFileMessage {
  timeStamp: string;
  severity: SeverityEnum;
  pluginName: string,
  category?: string;
  areaInPlugin?: string;
  message: string;
}