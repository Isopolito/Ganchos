import { Observable } from "threads/observable"
import { PluginCategory, PluginArguments, PluginLogMessage } from ".";

export interface GanchosPlugin {
    getName(): string;
    getDescription(): string;
    getEventTypes(): EventType[];
    getDefaultConfigJson(): string;
    getCategory(): PluginCategory;
    getLogSubscription(): Observable<PluginLogMessage>;

    init(): void;
    run(args: PluginArguments): void;
    tearDown(): void;
}
