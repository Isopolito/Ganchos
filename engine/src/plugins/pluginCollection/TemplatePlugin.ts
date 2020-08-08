import { Observable } from "threads/observable"
import { expose } from 'threads/worker'
import {
    GanchosPluginBaseLogic, PluginLogMessage, PluginCategory,
    GanchosPlugin, SeverityEnum, GanchosExecutionArguments, EventType
} from 'ganchos-shared';

let baseLogic: GanchosPluginBaseLogic;

const templatePlugin: GanchosPlugin = {
    // Configure this section
    getName: (): string => "TemplatePlugin",
    getDescription: (): string => "Description",
    getEventTypes: (): EventType[] => ["add", "unlink"],
    getCategory: (): PluginCategory => 'System',
    isEligibleForSchedule: (): boolean => false,

    // * runDelayInMinutes (optional): pause for a number of minutes before executing plugin (number can be less than 1). Defaults to 0
    // * runEveryXMinutes (optional): This will cause the plugin to run on a schedule, if 'isEligibleForSchedule' is true
    // The number can be fractional. Will be ignored if <= 0
    // A plugin can set this and still respond to events
    // The general config (option 'PluginWaitTimeFloorInMinutes') will prevent a plugin from being scheduled at too low of a number
    getDefaultConfigJson: (): string => ` 
    {
		"runDelayInMinutes": 3,
        "runEveryXMinutes": 0
    }
    `,

    // This section shouldn't need to change
    init: () => { baseLogic = new GanchosPluginBaseLogic() },
    tearDown: () => baseLogic.tearDown(),
    getLogSubscription: (): Observable<PluginLogMessage> => baseLogic.getLogSubscription(),

    // *** Plugin logic goes in here
    run: (args: GanchosExecutionArguments) => {
        // Validated json string is passed in as config, if not available the default configuration defined above will be used
        const config = JSON.parse(args.jsonConfig);

        // Example of how to log a message
        baseLogic.Log({
            severity: SeverityEnum.info,
            areaInPlugin: 'where in the code is this happening',
            message: `Hello from Template Plugin. Config value for 'runDelayInMinutes' - '${config.runDelayInMinutes}'`,
        });
    },
}

expose(templatePlugin as any);