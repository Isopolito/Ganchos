export interface GeneralConfig {
    userPluginPaths: string[];
    heartBeatPollIntervalInSeconds: Number;
    userPluginMetaExtension: string;
    enableDebug?: boolean;
    pluginScheduleIntervalFloorInMinutes: number,
    eventQueuePluginExecutionTimeout: number,
    eventQueuePluginExecutionConcurrency: number,
}

export const implementsGeneralConfig = (object: any): object is GeneralConfig => {
    if (!object) return false;

    const userPluginPaths = 'userPluginPaths' in object;
    const heartBeatPollIntervalInSeconds = 'heartBeatPollIntervalInSeconds' in object;
    const userPluginMetaExtension = 'userPluginMetaExtension' in object;
    const pluginScheduleIntervalFloorInMinutes = 'pluginScheduleIntervalFloorInMinutes' in object;
    const eventQueuePluginExecutionTimeout = 'eventQueuePluginExecutionTimeout' in object;
    const eventQueuePluginExecutionConcurrency = 'eventQueuePluginExecutionConcurrency' in object;

    return pluginScheduleIntervalFloorInMinutes && userPluginMetaExtension && userPluginPaths
        && heartBeatPollIntervalInSeconds && eventQueuePluginExecutionConcurrency && eventQueuePluginExecutionTimeout;
}
