import { ChildProcessWithoutNullStreams } from 'child_process'
import { ModuleConfig } from "./ModuleConfig";

export interface LoadedModule {
        name: string,
        isInError: boolean,
        isStarted: boolean,
        config: ModuleConfig,
        process: ChildProcessWithoutNullStreams,
}