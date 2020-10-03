export class PluginInstanceManager {
    pluginInstanceCancelHandlers = {};
    runningStatus = {};

    setRunningStatus(pluginName: string, status: boolean) {
        this.runningStatus[pluginName] = status;
    }

    setCanceledIfRunning(pluginName: string, onCancel: () => Promise<void>): Promise<void> {
        // If not running execute onCancel handler immediately 
        if (!this.runningStatus[pluginName]) return onCancel();

        this.pluginInstanceCancelHandlers[pluginName] = onCancel;
    }

    isCanceled(pluginName: string): boolean {
        return !!this.pluginInstanceCancelHandlers[pluginName];
    }

    async cancel(pluginName: string): Promise<void> {
        this.runningStatus[pluginName] = false;

        // Null out pluginInstanceCancelHandlers before calling handler so that isCanceled 
        // will work correctly if called from within handler logic
        const handler = this.pluginInstanceCancelHandlers[pluginName];
        this.pluginInstanceCancelHandlers[pluginName] = null;

        handler && await handler();
    }
}
