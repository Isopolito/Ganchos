import IpMonitor from 'ip-monitor'
import isOnline from 'is-online'
import { GeneralConfig, generalConfig, generalLogger, SeverityEnum, systemUtil } from '../shared'
import { dispatch } from './pluginEventDispatcher'

const logArea = `inetListener`;
let ipChangeMonitor: IpMonitor = null;
let isStopped: boolean = false;
let isInetUp: boolean;

const wireUpIpChangeMonitor = (configObj: GeneralConfig): void => {
    if (!ipChangeMonitor) {
        ipChangeMonitor = new IpMonitor({
            // Milliseconds
            pollingInterval: configObj.ipChangePollingIntervalInMinutes * 1000
        });
    }

    // Don`t dispatch event first time this fires up or if connection is lost to the internet 
    ipChangeMonitor.on(`change`, (prevIp, newIp) => {
        newIp && prevIp && dispatch(`ipChange`, { oldIpAddress: prevIp, newIpAddress: newIp })
    });

    ipChangeMonitor.on(`error`, (error: any) => {
        const errorMessage: string = error && error.toString();
        if (!errorMessage) return;

        // When the internet goes down the ipChangeMonitor is stopped, it's a waste to call out for ip address changes if there's no wan connection.
        // But, there can be a slight lag before the inet is registered as down and the IpChangeMonitor is stopped. So, filter out those error messages since
        // they are not a real error. 
        // TODO: This needs to be improved since it's possible that legit errors with 'getaddrinfo EAI_AGAIN' could be lost
        if (errorMessage.includes(`getaddrinfo EAI_AGAIN`)) return;
        if (errorMessage.includes(`Request timed out from`)) return;

        generalLogger.write(SeverityEnum.error, logArea, errorMessage);
    });
}

const startIpChangeMonitor = (configObj: GeneralConfig) => {
    wireUpIpChangeMonitor(configObj);
    ipChangeMonitor.start();
}

const stopIpChangeMonitor = () => ipChangeMonitor && ipChangeMonitor.stop();

const checkOnlineStatusAndDispatchEventIfNeeded = async () => {
    try {
        if (await isOnline()) {
            if (!isInetUp) {
                // Internet was off, now it's on
                startIpChangeMonitor(await generalConfig.get());
                await dispatch(`inetUp`, null);
                isInetUp = true;
            }
        } else {
            if (isInetUp) {
                // Internet was on, now it's off
                stopIpChangeMonitor();
                await dispatch(`inetDown`, null);
                isInetUp = false;
            }
        }
    } catch (e) {
        generalLogger.write(SeverityEnum.error, `${logArea} - ${checkOnlineStatusAndDispatchEventIfNeeded.name}`, e);
    }
}

const startIpUpDownWatcher = async (configObj: GeneralConfig): Promise<void> => {
    isStopped = false;
    isInetUp = await isOnline();
    while (true) {
        if (isStopped) break;
        await checkOnlineStatusAndDispatchEventIfNeeded();
        await systemUtil.waitInMinutes(configObj.ipUpPollingIntervalInMinutes);
    }
}

const start = async (): Promise<void> => {
    try {
        const configObj = await generalConfig.get();
        startIpChangeMonitor(configObj);
        await startIpUpDownWatcher(configObj);
    } catch (e) {
        generalLogger.write(SeverityEnum.error, `${logArea} - ${start.name}`, e);
    }
}

const stop = async (): Promise<void> => {
    try {
        isStopped = true;
        stopIpChangeMonitor();
    } catch (e) {
        generalLogger.write(SeverityEnum.error, `${logArea} - ${stop.name}`, e);
    }
}

export {
    stop,
    start
}
