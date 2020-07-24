import { EventType } from ".";

export type GanchosExecutionArguments = {
    jsonConfig: string;
    filePath: string;
    eventType: EventType;
};
