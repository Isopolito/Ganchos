import { EventType } from ".";

export type GanchosExecutionArguments = {
    jsonConfig: string;
    eventData: any;
    eventType: EventType;
};
