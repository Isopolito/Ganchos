export interface GeneralConfig {
    PluginPaths: string[];
    heartBeatPollIntervalInSeconds: Number;
    PluginMetaExtension: string;
    enableDebug?: boolean;
    pluginScheduleIntervalFloorInMinutes: number,
    eventQueuePluginExecutionTimeout: number,
    eventQueuePluginExecutionConcurrency: number,
    ipUpPollingIntervalInMinutes: number;
    ipChangePollingIntervalInMinutes: number;
}

export const implementsGeneralConfig = (object: any): object is GeneralConfig => {
    if (!object) return false;

    const PluginPaths = 'PluginPaths' in object;
    const heartBeatPollIntervalInSeconds = 'heartBeatPollIntervalInSeconds' in object;
    const PluginMetaExtension = 'PluginMetaExtension' in object;
    const pluginScheduleIntervalFloorInMinutes = 'pluginScheduleIntervalFloorInMinutes' in object;
    const eventQueuePluginExecutionTimeout = 'eventQueuePluginExecutionTimeout' in object;
    const eventQueuePluginExecutionConcurrency = 'eventQueuePluginExecutionConcurrency' in object;
    const ipUpPollingIntervalInMinutes = 'ipUpPollingIntervalInMinutes' in object;
    const ipChangePollingIntervalInMinutes = 'ipChangePollingIntervalInMinutes' in object;

    return pluginScheduleIntervalFloorInMinutes && PluginMetaExtension && PluginPaths
        && heartBeatPollIntervalInSeconds && eventQueuePluginExecutionConcurrency && eventQueuePluginExecutionTimeout
        && ipChangePollingIntervalInMinutes && ipUpPollingIntervalInMinutes;
}
