"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ganchas_shared_1 = __importDefault(require("ganchas-shared"));
try {
    process.on('SIGINT', () => {
        // Log message stating that the app is getting shutdown
    });
    //logger.log(logConst.levels.info, 'Engine starting...');
    const config = ganchas_shared_1.default.generalConfig.default.getAndCreateDefaultIfNotExist();
    console.log(JSON.stringify(config));
    debugger;
    // Start up event eventListener
    console.log("Started Event Listener...");
}
catch (e) {
    //logger.log(logConst.levels.error, `Fatal error: ${e}`);
    // eslint-disable-next-line no-console
    console.log(`Fatal Error: ${e}`);
    process.exit(1);
}
//# sourceMappingURL=app.js.map