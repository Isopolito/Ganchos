import { Observable } from "threads/observable"
import { expose } from 'threads/worker'
import {
    GanchosPluginBaseLogic, PluginLogMessage, PluginCategory, GanchosPlugin,
    SeverityEnum, GanchosExecutionArguments, EventType, OsType
} from 'ganchos-shared';

let baseLogic: GanchosPluginBaseLogic;

const templatePlugin: GanchosPlugin = {
    // Configure this section
    getName: (): string => "ScheduledPlugin",
    getDescription: (): string => "Description",
    getEventTypes: (): EventType[] => ["add", "unlink"],
    getCategory: (): PluginCategory => 'System',
    isEligibleForSchedule: (): boolean => true,
    getOsTypesToRunOn: (): OsType[] => ['freebsd', 'linux', 'darwin', 'openbsd', 'sunos'],
    //getOsTypesToRunOn: (): OsType[] => ['win32'],
    getDefaultConfigJson: (): string => ` 
    {
        "foo": "bar",
        "runEveryXMinutes": 2
    }
    `,

    // This section shouldn't need to change
    init: () => { baseLogic = new GanchosPluginBaseLogic() },
    tearDown: () => baseLogic.tearDown(),
    getLogSubscription: (): Observable<PluginLogMessage> => baseLogic.getLogSubscription(),

    // *** Plugin logic goes in here
    run: (args: GanchosExecutionArguments) => {
        // Validated json string is passed in as config, if not available the default configuration defined above will be used
        const configObj = JSON.parse(args.jsonConfig);

        // Example of how to log a message
        baseLogic.Log({
            severity: SeverityEnum.info,
            areaInPlugin: 'blah',
            message: `Hello from Scheduled Plugin. Config value for 'runEveryXMinutes' - '${configObj.runEveryXMinutes}'`,
        });
    },
}

expose(templatePlugin as any);