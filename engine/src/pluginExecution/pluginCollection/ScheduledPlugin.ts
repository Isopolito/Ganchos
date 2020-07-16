import { Observable } from "threads/observable"
import { expose } from 'threads/worker'
import {
    GanchosPluginBaseLogic, PluginLogMessage, PluginCategory, GanchosPlugin,
    SeverityEnum, GanchosPluginArguments, GanchosBaseConfig, EventType
} from 'ganchos-shared';

let baseLogic: GanchosPluginBaseLogic;

// Should match the shape of json returned from getDefaultConfigJson()
interface Config extends GanchosBaseConfig {
    foo: string;
}

const templatePlugin: GanchosPlugin = {
    // Configure this section
    getName: (): string => "ScheduledPlugin",
    getDescription: (): string => "Description",
    getEventTypes: (): EventType[] => ["add", "unlink"],
    getCategory: (): PluginCategory => 'System',
    isEligibleForSchedule: (): boolean => true,
    getDefaultConfigJson: (): string => ` 
    {
        "foo": "bar",
        "runPluginEveryXMinutes": 2
    }
    `,

    // This section shouldn't need to change
    init: () => { baseLogic = new GanchosPluginBaseLogic() },
    tearDown: () => baseLogic.tearDown(),
    getLogSubscription: (): Observable<PluginLogMessage> => baseLogic.getLogSubscription(),

    // *** Plugin logic goes in here
    run: (args: GanchosPluginArguments) => {
        // Validated json string is passed in as config, if not available the default configuration defined above will be used
        const config: Config = JSON.parse(args.jsonConfig);

        // Example of how to log a message
        baseLogic.Log({
            severity: SeverityEnum.info,
            areaInPlugin: 'blah',
            message: `Hello from Scheduled Plugin. Config value for 'RunPluginEveryXMinutes' - '${config.runPluginEveryXMinutes}'`,
        });
    },
}

expose(templatePlugin as any);