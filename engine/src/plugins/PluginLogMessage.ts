import { SeverityEnum } from 'ganchos-shared';

export interface PluginLogMessage {
    severity: SeverityEnum;
    areaInPlugin: string;
    message: string;
}
