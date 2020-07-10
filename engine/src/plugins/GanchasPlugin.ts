import { Observable } from "threads/observable"
import { PluginCategory, PluginArguments, PluginLogMessage } from "./";

export interface GanchasPlugin {
    getName(): string;
    getDescription(): string;
    getEventTypes(): EventType[];
    getDefaultConfigurationJson(): string;
    getCategory(): PluginCategory;
    getLogSubscription(): Observable<PluginLogMessage>;

    init(): void;
    run(args: PluginArguments): void;
    tearDown(): void;
}