export interface GeneralConfig {
    pluginPaths: string[];
    moduleConfigPath: string;
    heartBeatPollIntervalInSeconds: Number;
    pluginMetaExtension: string;
    enableDebug?: boolean;
    pluginScheduleIntervalFloorInMinutes: number,
    eventQueuePluginExecutionTimeout: number,
    eventQueuePluginExecutionConcurrency: number,
    ipUpPollingIntervalInMinutes: number;
    ipChangePollingIntervalInMinutes: number;
}

export const implementsGeneralConfig = (object: any): object is GeneralConfig => {
    if (!object) return false;

    const pluginPaths = 'pluginPaths' in object;
    const moduleConfigPath = 'moduleConfigPath' in object;
    const heartBeatPollIntervalInSeconds = 'heartBeatPollIntervalInSeconds' in object;
    const pluginMetaExtension = 'pluginMetaExtension' in object;
    const pluginScheduleIntervalFloorInMinutes = 'pluginScheduleIntervalFloorInMinutes' in object;
    const eventQueuePluginExecutionTimeout = 'eventQueuePluginExecutionTimeout' in object;
    const eventQueuePluginExecutionConcurrency = 'eventQueuePluginExecutionConcurrency' in object;
    const ipUpPollingIntervalInMinutes = 'ipUpPollingIntervalInMinutes' in object;
    const ipChangePollingIntervalInMinutes = 'ipChangePollingIntervalInMinutes' in object;

    return pluginScheduleIntervalFloorInMinutes && pluginMetaExtension && pluginPaths && moduleConfigPath
        && heartBeatPollIntervalInSeconds && eventQueuePluginExecutionConcurrency && eventQueuePluginExecutionTimeout
        && ipChangePollingIntervalInMinutes && ipUpPollingIntervalInMinutes;
}
