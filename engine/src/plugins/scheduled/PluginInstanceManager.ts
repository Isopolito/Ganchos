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
        this.pluginInstanceCancelHandlers[pluginName] && await this.pluginInstanceCancelHandlers[pluginName]();
        this.pluginInstanceCancelHandlers[pluginName] = null;
    }
}
