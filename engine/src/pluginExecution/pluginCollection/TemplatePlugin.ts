import { Observable } from "threads/observable"
import { expose } from 'threads/worker'
import { GanchosPluginBaseLogic, PluginLogMessage, PluginCategory, GanchosPlugin, SeverityEnum, GanchosPluginArguments, EventType } from 'ganchos-shared';

let baseLogic: GanchosPluginBaseLogic;

const templatePlugin: GanchosPlugin = {
    // Configure this section
    getName: (): string => "TemplatePlugin",
    getDescription: (): string => "Description",
    getEventTypes: (): EventType[] => ["add", "unlink"],
    getCategory: (): PluginCategory => 'System',
    isEligibleForSchedule: (): boolean => false,
    getDefaultConfigJson: (): string => ` 
    {
        "foo": "bar"
    }
    `,

    // This section shouldn't need to change
    init: () => { baseLogic = new GanchosPluginBaseLogic() },
    tearDown: () => baseLogic.tearDown(),
    getLogSubscription: (): Observable<PluginLogMessage> => baseLogic.getLogSubscription(),

    // *** Plugin logic goes in here
    run: (args: GanchosPluginArguments) => {
        // Validated json string is passed in as config, if not available the default configuration defined above will be used
        const config = JSON.parse(args.jsonConfig);

        // Example of how to log a message
        baseLogic.Log({
            severity: SeverityEnum.info,
            areaInPlugin: 'where in the code is this happening',
            message: `Hello from Template Plugin. Config value for 'foo' - '${config.foo}'`,
        });
    },
}

expose(templatePlugin as any);