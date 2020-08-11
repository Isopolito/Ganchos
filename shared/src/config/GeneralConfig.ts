export interface GeneralConfig {
    lastUpdatedTimeStamp: Number;
    userPluginPaths: string[];
    heartBeatPollIntervalInSeconds: Number;
    userPluginMetaExtension: string;
    enableDebug?: boolean;
}

export const implementsGeneralConfig = (object: any): object is GeneralConfig => {
    if (!object) return false;

    const lastUpdatedTimeStamp = 'lastUpdatedTimeStamp' in object;
    const userPluginPaths = 'userPluginPaths' in object;
    const heartBeatPollIntervalInSeconds = 'heartBeatPollIntervalInSeconds' in object;
    const userPluginMetaExtension = 'userPluginMetaExtension' in object;

    return lastUpdatedTimeStamp && userPluginMetaExtension && userPluginPaths && heartBeatPollIntervalInSeconds;
}
