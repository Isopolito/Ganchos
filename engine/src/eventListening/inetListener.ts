import isOnline from 'is-online';
import IpMonitor from 'ip-monitor';
import { GeneralConfig, generalConfig } from 'ganchos-shared';
import { dispatch } from './pluginEventDispatcher';

// ----------------------------------------------------------------------------------------------

let ipMonitor: IpMonitor = null;

const wireUpIpMonitor = (configObj: GeneralConfig) => {
    if (!ipMonitor) {
        ipMonitor = new IpMonitor({
            // Milliseconds
            pollingInterval: configObj.ipChangePollingIntervalInMinutes * 1000
        });
    }

    //ipMonitor.on('change', (prevIp, newIp) => dispatch(ipChange));

    ipMonitor.on('error', (error: any) => {
        console.error(error);
    });

    ipMonitor.start();
}

// ----------------------------------------------------------------------------------------------

const start = async (): Promise<void> => {
    const configObj = await generalConfig.get();

    wireUpIpMonitor(configObj);

}

const stop = async (): Promise<void> => {

}

export {
    stop,
    start,
}