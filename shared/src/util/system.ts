const waitInSeconds = (seconds: number): Promise<void> => new Promise(resolve => seconds > 0 && setTimeout(resolve, seconds * 1000));
const waitInMinutes = (minutes: number): Promise<void> => waitInSeconds(minutes * 60);
const deepClone = (obj: any): any => obj && JSON.parse(JSON.stringify(obj));

const flattenAndDistinct =(arrays: any[]): any[] => {
    if (!arrays || arrays.length <= 0) return [];

    const flattenedResults = arrays.reduce((arr, val) => [...arr, ...val], []);
    return flattenedResults
        ? [...new Set(flattenedResults)]
        : [];
}

export {
    waitInMinutes,
    waitInSeconds,
    deepClone,
    flattenAndDistinct,
}