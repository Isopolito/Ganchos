import { Observable } from "threads/observable"
import { expose } from 'threads/worker'
import { SeverityEnum } from 'ganchas-shared';
import { PluginBaseLogic, PluginLogMessage, PluginCategory, GanchasPlugin, PluginArguments } from "../";

let baseLogic: PluginBaseLogic;

const templatePlugin: GanchasPlugin = {
    // Configure this section. This is what shows up in the UI
    getName: (): string => "TemplatePlugin",
    getDescription: (): string => "Description",
    getEventTypes: (): EventType[] => ["add", "unlink"],
    getCategory: (): PluginCategory => 'System',
    getDefaultConfigurationJson: (): string => ` 
    {
        foo: "bar"
    }
    `,

    // This section shouldn't need to change
    init: () => { baseLogic = new PluginBaseLogic() },
    tearDown: () => baseLogic.tearDown(),
    getLogSubscription: (): Observable<PluginLogMessage> => baseLogic.getLogSubscription(),

    // Plugin logic goes in here
    run: (args: PluginArguments) => {
        // Example of how to log a message
        baseLogic.Log({
            severity: SeverityEnum.info,
            areaInPlugin: 'where in the code is this happening',
            message: 'Template Plugin',
        });
    },
}

expose(templatePlugin as any);