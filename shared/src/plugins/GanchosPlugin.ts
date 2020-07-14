import { Observable } from "threads/observable"
import { PluginCategory, PluginArguments, PluginLogMessage, EventType } from ".";

export interface GanchosPlugin {
    getName(): string;
    getDescription(): string;
    getEventTypes(): EventType[];
    getDefaultConfigJson(): string;
    getCategory(): PluginCategory;
    getLogSubscription(): Observable<PluginLogMessage>;
    isEligibleForSchedule(): boolean;

    init(): void;
    run(args: PluginArguments): void;
    tearDown(): void;
}
