import { EventType } from ".";
import { systemUtil } from "..";
import { OsType } from "./os/OsType";

export interface Plugin {
    // Mandatory
    execFilePath: string;
    name: string;
    description: string;
    category: string;
    defaultConfig: any;

    // Optional
    isEligibleForSchedule?: boolean;
    runOnlyOnOsTypes?: OsType[],
    putDataInEnvironment?: boolean,
    eventTypes?: EventType[];

    // Handled by Ganchos - no need to put in meta file
    path: string;
}

export const implementsPlugin = (object: any): string|null => {
    if (!object) return null;

    const missingProps = [];
    if (!('name' in object)) missingProps.push('name');
    if (!('execFilePath' in object)) missingProps.push('execFilePath');
    if (!('description' in object)) missingProps.push('description');
    if (!('defaultConfig' in object)) missingProps.push('defaultConfig');

    if (missingProps.length) return systemUtil.safeJoin(missingProps);
    return null;
}
