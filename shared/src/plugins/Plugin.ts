import { EventType } from ".";
import { OsType } from "./os/OsType";

export interface Plugin {
    // Mandatory
    binFileName: string;
    name: string;
    description: string;
    category: string;
    defaultJsonConfig: any;

    // Optional
    isEligibleForSchedule?: boolean;
    runOnlyOnOsTypes?: OsType[],
    putDataInEnvironment?: boolean,
    eventTypes: EventType[];

    // Handled by Ganchos - no need to put in meta file
    path: string;
}

export const implementsPlugin = (object: any): object is Plugin => {
    if (!object) return false;

    const name = 'name' in object;
    const binFileName = 'binFileName' in object;
    const description = 'description' in object;
    const eventTypes = 'eventTypes' in object;
    const defaultJsonConfig = 'defaultJsonConfig' in object;

    return name && binFileName && description && eventTypes && defaultJsonConfig;
}
