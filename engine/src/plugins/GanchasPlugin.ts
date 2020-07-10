import { Observable } from "threads/observable"
import { PluginLogMessage } from "./PluginLogMessage";
import { PluginCategory } from "./PluginCategory";
import { PluginArguments } from "./PluginArguments";

export interface GanchasPlugin {
    name: string;
    description: string;
    eventTypes: EventType[];
    category: PluginCategory;
    defaultConfigurationJson: string;

    init(): void;
    run(args: PluginArguments): void;
    getLogSubscription(): Observable<PluginLogMessage>;
    tearDown(): void;
}