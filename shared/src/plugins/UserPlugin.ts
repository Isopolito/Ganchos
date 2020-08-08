import { EventType } from ".";
import { OsType } from "./os/OsType";

export interface UserPlugin {
    // Mandatory
    binFileName: string;
    name: string;
    description: string;
    category: string;
    eventTypes: EventType[];
    defaultJsonConfig: any;
    watchPaths?: string[],

    // Optional
    isEligibleForSchedule?: boolean;
    enabled?: boolean;
    runDelayInMinutes?: number;
    runOnlyOnOsTypes?: OsType[],

    // Handled by Ganchos - no need to put in meta file
    path: string;
}

export const implementsUserPlugin = (object: any): object is UserPlugin => {
    if (!object) return false;

    const name = 'name' in object;
    const binFileName = 'binFileName' in object;
    const description = 'description' in object;
    const eventTypes = 'eventTypes' in object;
    const defaultJsonConfig = 'defaultJsonConfig' in object;

    return name && binFileName && description && eventTypes && defaultJsonConfig;
}
