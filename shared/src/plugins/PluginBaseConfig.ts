export interface PluginBaseConfig {
    enabled: boolean;

    // Pause for a number of minutes before executing plugin (number can be less than 1)
    runDelayInMinutes: number;

    // This will cause the plugin to run on a schedule
    // The number can be fractional
    // A plugin can set this and still respond to events
    // The general config (option 'PluginWaitTimeFloorInMinutes') will prevent a plugin from being
    // scheduled at too low of a number
    runPluginEveryXMinutes: number;
}

export const implementsPluginBaseConfig = (object: any): object is PluginBaseConfig => {
    if (!object) return false;

    const enabled = 'enabled' in object;
    const runPluginEveryXMinutes = 'runPluginEveryXMinutes' in object;

    return enabled && runPluginEveryXMinutes;
}
