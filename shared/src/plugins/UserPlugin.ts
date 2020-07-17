import { EventType } from ".";

export interface UserPlugin {
    name: string;
    description: string;
    category: string;
    isEligibleForSchedule: boolean;
    eventTypes: EventType[];
    defaultJsonConfig: any;
}

export const implementsUserPlugin = (object: any): object is UserPlugin => {
    const name = 'name' in object;
    const description = 'description' in object;
    const isEligibleForSchedule = 'isEligibleForSchedule' in object;
    const eventTypes = 'eventTypes' in object;
    const defaultJsonConfig = 'defaultJsonConfig' in object;

    return name && description && isEligibleForSchedule && eventTypes && defaultJsonConfig;
}
