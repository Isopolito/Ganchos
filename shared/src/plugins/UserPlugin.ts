import { EventType } from ".";

export interface UserPlugin {
    binFileName: string;
    name: string;
    description: string;
    category: string;
    isEligibleForSchedule: boolean;
    eventTypes: EventType[];
    defaultJsonConfig: any;

    // No need to put in .meta file, handled by ganchos
    path: string;
}

export const implementsUserPlugin = (object: any): object is UserPlugin => {
    const name = 'name' in object;
    const description = 'description' in object;
    const isEligibleForSchedule = 'isEligibleForSchedule' in object;
    const eventTypes = 'eventTypes' in object;
    const defaultJsonConfig = 'defaultJsonConfig' in object;

    return name && description && isEligibleForSchedule && eventTypes && defaultJsonConfig;
}
