const waitInSeconds = (seconds: number): Promise<void> => new Promise(resolve => seconds > 0 && setTimeout(resolve, seconds * 1000));
const waitInMinutes = (minutes: number): Promise<void> => waitInSeconds(minutes * 60);
const deepClone = (obj: any): any => obj && JSON.parse(JSON.stringify(obj));

export {
    waitInMinutes,
    waitInSeconds,
    deepClone,
}