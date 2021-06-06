import { ChildProcessWithoutNullStreams } from 'child_process'
import { ModuleConfig } from "./ModuleConfig";

export interface LoadedModule {
    isInError: boolean,
    config: ModuleConfig,
    process: ChildProcessWithoutNullStreams,
}