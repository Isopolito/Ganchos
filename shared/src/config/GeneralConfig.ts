export interface GeneralConfig {
    userPluginPaths: string[];
    heartBeatPollIntervalInSeconds: Number;
    userPluginMetaExtension: string;
    enableDebug?: boolean;
    pluginScheduleIntervalFloorInMinutes: number,
}

export const implementsGeneralConfig = (object: any): object is GeneralConfig => {
    if (!object) return false;

    const userPluginPaths = 'userPluginPaths' in object;
    const heartBeatPollIntervalInSeconds = 'heartBeatPollIntervalInSeconds' in object;
    const userPluginMetaExtension = 'userPluginMetaExtension' in object;
    const pluginScheduleIntervalFloorInMinutes = 'pluginScheduleIntervalFloorInMinutes' in object;

    return pluginScheduleIntervalFloorInMinutes && userPluginMetaExtension && userPluginPaths && heartBeatPollIntervalInSeconds;
}
