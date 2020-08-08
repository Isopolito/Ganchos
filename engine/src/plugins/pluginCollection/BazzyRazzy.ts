"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_1 = require("threads/worker");
const ganchos_shared_1 = require("ganchos-shared");
let baseLogic;
const scheduledPlugin = {
    // Configure this section
    getName: () => "ScheduledPlugin",
    getDescription: () => "Description",
    getEventTypes: () => ["add", "unlink"],
    getCategory: () => 'System',
    isEligibleForSchedule: () => true,
    getOsTypesToRunOn: () => [],
    getDefaultConfigJson: () => ` 
    {
        "foo": "bar",
        "runEveryXMinutes": 2
    }
    `,
    // This section shouldn't need to change
    init: () => { baseLogic = new ganchos_shared_1.GanchosPluginBaseLogic(); },
    tearDown: () => {
        if (baseLogic) {
            baseLogic.tearDown();
            baseLogic = null;
        }
    },
    getLogSubscription: () => baseLogic.getLogSubscription(),
    // *** Plugin logic goes in here
    run: (args) => {
        // Validated json string is passed in as config, if not available the default configuration defined above will be used
        const configObj = JSON.parse(args.jsonConfig);
        // Example of how to log a message
        baseLogic.Log({
            severity: ganchos_shared_1.SeverityEnum.info,
            areaInPlugin: 'blah',
            message: `Hello from Scheduled Plugin. Config value for 'runEveryXMinutes' - '${configObj.runEveryXMinutes}'`,
        });
    },
};
worker_1.expose(scheduledPlugin);
//# sourceMappingURL=ScheduledPlugin.js.map