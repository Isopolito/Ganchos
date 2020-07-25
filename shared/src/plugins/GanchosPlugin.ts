import { Observable } from "threads/observable"
import { PluginCategory, GanchosExecutionArguments, PluginLogMessage, EventType } from ".";
import { OsType } from "./os/OsType";

export interface GanchosPlugin {
    getName(): string;
    getDescription(): string;
    getEventTypes(): EventType[];
    getOsTypesToRunOn?(): OsType[]; // Optional
    getDefaultConfigJson(): string;
    getCategory(): PluginCategory;
    getLogSubscription(): Observable<PluginLogMessage>;
    isEligibleForSchedule(): boolean;

    init(): void;
    run(args: GanchosExecutionArguments): void;
    tearDown(): void;
}
