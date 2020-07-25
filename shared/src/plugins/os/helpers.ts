import os from 'os';
import { OsType } from './OsType';

const isThisRunningOnOs = (osTypes: OsType[]): boolean => {
    if (!osTypes) return true; // Caller doesn't care about OS type`
    return osTypes.includes(os.platform() as OsType)
}

export {
    isThisRunningOnOs,
}