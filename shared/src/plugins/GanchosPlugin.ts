import { Observable } from "threads/observable"
import { PluginCategory, GanchosExecutionArguments, PluginLogMessage, EventType } from ".";
import { OsType } from "./os/OsType";

export interface GanchosPlugin {
    getName(): string;
    getDescription(): string;
    getDefaultConfigJson(): string;
    getCategory(): PluginCategory;

    isEligibleForSchedule(): boolean; // Optional
    getOsTypesToRunOn?(): OsType[]; // Optional
    getEventTypes(): EventType[]; // Optional

    init(): void;
    getLogSubscription(): Observable<PluginLogMessage>;
    run(args: GanchosExecutionArguments): void;
    tearDown(): void;
}
