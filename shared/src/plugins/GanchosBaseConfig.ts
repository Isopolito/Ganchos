
export interface GanchosBaseConfig {
    enabled: boolean;

    // This will cause the plugin to run on a schedule
    // The number can be fractional
    // A plugin can set this and still respond to events
    // The general config (option 'PluginWaitTimeFloorInMinutes') will prevent a plugin from being
    // scheduled at too low of a number
    runPluginEveryXMinutes: number;
}
