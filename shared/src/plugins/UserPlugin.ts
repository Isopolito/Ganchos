import { EventType } from ".";
import { OsTypes } from "..";

export interface UserPlugin {
    // Mandatory
    binFileName: string;
    name: string;
    description: string;
    category: string;
    eventTypes: EventType[];
    defaultJsonConfig: any;

    // Optional
    isEligibleForSchedule?: boolean;
    enabled?: boolean;
    runDelayInMinutes?: number;
    osRunOnly?: OsTypes[],

    // Handled by Ganchos - no need to put in meta file
    path: string;
}

export const implementsUserPlugin = (object: any): object is UserPlugin => {
    if (!object) return false;

    const name = 'name' in object;
    const description = 'description' in object;
    const eventTypes = 'eventTypes' in object;
    const defaultJsonConfig = 'defaultJsonConfig' in object;

    return name && description && eventTypes && defaultJsonConfig;
}
