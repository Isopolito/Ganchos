const waitInSeconds = (seconds: number): Promise<void> => new Promise(resolve => seconds > 0 && setTimeout(resolve, seconds * 1000));
const waitInMinutes = (minutes: number): Promise<void> => waitInSeconds(minutes * 60);

export {
    waitInMinutes,
    waitInSeconds,
}