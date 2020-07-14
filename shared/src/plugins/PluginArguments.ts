import { EventType } from ".";

export type PluginArguments = {
    jsonConfig: string;
    filePath: string;
    eventType: EventType;
};
