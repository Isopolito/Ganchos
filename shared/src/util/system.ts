const waitInSeconds = (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));
const waitInMinutes = (minutes: number) => waitInSeconds(minutes * 60);

export {
    waitInMinutes,
    waitInSeconds,
}