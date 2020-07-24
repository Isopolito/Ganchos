import { Observable } from "threads/observable"
import { PluginCategory, GanchosExecutionArguments, PluginLogMessage, EventType } from ".";

export interface GanchosPlugin {
    getName(): string;
    getDescription(): string;
    getEventTypes(): EventType[];
    getDefaultConfigJson(): string;
    getCategory(): PluginCategory;
    getLogSubscription(): Observable<PluginLogMessage>;
    isEligibleForSchedule(): boolean;

    init(): void;
    run(args: GanchosExecutionArguments): void;
    tearDown(): void;
}

