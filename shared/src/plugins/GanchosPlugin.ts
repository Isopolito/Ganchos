import { Observable } from "threads/observable"
import { PluginCategory, GanchosPluginArguments, PluginLogMessage, EventType } from ".";

export interface GanchosPlugin {
    getName(): string;
    getDescription(): string;
    getEventTypes(): EventType[];
    getDefaultConfigJson(): string;
    getCategory(): PluginCategory;
    getLogSubscription(): Observable<PluginLogMessage>;
    isEligibleForSchedule(): boolean;

    init(): void;
    run(args: GanchosPluginArguments): void;
    tearDown(): void;
}

