import os from 'os';
type OsType = 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32';

const isThisRunningOnOs = (osTypes: OsType[]): boolean => {
    if (!osTypes) return true; // Caller doesn't care about OS type`
    return osTypes.includes(os.platform() as OsType)
}

export {
    OsType,
    isThisRunningOnOs,
}