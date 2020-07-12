import { SeverityEnum } from 'ganchas-shared';

export interface PluginLogMessage {
    severity: SeverityEnum;
    areaInPlugin: string;
    message: string;
}
