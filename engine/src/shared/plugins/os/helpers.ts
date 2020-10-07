import os from 'os';
import { OsType } from './OsType';

const shouldNotRunOnThisOs = (osTypes: OsType[]): boolean => {
    if (!osTypes || osTypes.length <= 0) return false;
    return !osTypes.includes(os.platform() as OsType);
}

export {
    shouldNotRunOnThisOs,
}