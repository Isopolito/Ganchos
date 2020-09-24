import IpMonitor from 'ip-monitor';
import { GeneralConfig, generalConfig, generalLogger, SeverityEnum } from 'ganchos-shared';
import { dispatch } from './pluginEventDispatcher';

let ipMonitor: IpMonitor = null;
const logArea = 'inetListener';

const wireUpIpMonitor = (configObj: GeneralConfig): void => {
    if (!ipMonitor) {
        ipMonitor = new IpMonitor({
            // Milliseconds
            pollingInterval: configObj.ipChangePollingIntervalInMinutes * 1000
        });
    }

    ipMonitor.on('change', (prevIp, newIp) => dispatch('ipChange', { oldIpAddress: prevIp, newIpAddress: newIp }));
    ipMonitor.on('error', (error: any) => generalLogger.write(SeverityEnum.error, logArea, error.toString()));
}

const start = async (): Promise<void> => {
    const configObj = await generalConfig.get();
    wireUpIpMonitor(configObj);
    ipMonitor.start();
}

const stop = async (): Promise<void> => ipMonitor && ipMonitor.stop();

export {
    stop,
    start,
}