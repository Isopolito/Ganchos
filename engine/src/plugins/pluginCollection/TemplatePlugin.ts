import { expose } from 'threads/worker'
import { SeverityEnum } from 'ganchas-shared';
import { PluginLogic } from '../PluginLogic';
import { PluginArguments } from "../PluginArguments";
import { GanchasPlugin } from "../GanchasPlugin";

let pluginLogic: PluginLogic;

const templatePlugin: GanchasPlugin = {
    name: 'TemplatePlugin',
    category: 'System',
    description: 'Description',
    eventTypes: ['add', 'unlink'],
    defaultConfigurationJson: ` 
    {
        foo: "bar"
    }
    `,

    init: () => { pluginLogic = new PluginLogic() },
    tearDown: () => pluginLogic.tearDown(),
    getLogSubscription: () => pluginLogic.getLogSubscription(),

    run: (args: PluginArguments) => {

        // **** PLUGIN LOGIC GOES HERE ****

        // Example of how to log a message
        pluginLogic.Log({
            severity: SeverityEnum.info,
            areaInPlugin: 'where in the plugin code is this happening',
            message: 'TemplatePlugin message',
            shouldLogToConsole: true
        });
    },
}

expose(templatePlugin as any);