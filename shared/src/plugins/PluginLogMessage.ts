import { SeverityEnum } from "..";

export interface PluginLogMessage {
    severity: SeverityEnum;
    areaInPlugin: string;
    message: string;
}
