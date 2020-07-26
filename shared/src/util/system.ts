const waitInSeconds = (seconds: number) => new Promise(resolve => seconds > 0 && setTimeout(resolve, seconds * 1000));
const waitInMinutes = (minutes: number) => waitInSeconds(minutes * 60);

export {
    waitInMinutes,
    waitInSeconds,
}