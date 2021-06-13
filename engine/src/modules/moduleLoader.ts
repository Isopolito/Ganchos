import { promises as fs } from 'fs';
import { spawn } from 'child_process'
import { fileUtil, generalLogger, SeverityEnum, generalConfig } from '../shared'
import { LoadedModule } from "./LoadedModule";
import { ModuleConfig } from "./ModuleConfig";

const logArea = "moduleLoader";

const loadSingle = async (moduleConfig: ModuleConfig): Promise<LoadedModule> => {
        const loadedModule: LoadedModule = {
                name: moduleConfig.name,
                isInError: false,
                config: moduleConfig,
                process: null,
                isStarted: false,
        };

        if (!fileUtil.doesPathExist(moduleConfig.path)) {
                generalLogger.write(SeverityEnum.error, logArea, `Module '${moduleConfig.name}' at path '${moduleConfig.path}' not found`);
                loadedModule.isInError = true;
        } else if (moduleConfig.shouldStart) {
                try {
                        loadedModule.process = spawn(moduleConfig.path, moduleConfig.params);
                        loadedModule.isStarted = true;
                        loadedModule.process.on('close', () => loadedModule.isStarted = false);
                        loadedModule.process.on('error', (_) => {
                                loadedModule.isInError = true;
                                loadedModule.isStarted = false;
                        });
                } catch (e) {
                        loadedModule.isInError = true;
                }
        }

        return loadedModule;
}

const load = async (moduleConfigs: ModuleConfig[]): Promise<LoadedModule[]> => {
        const loadedModules: Promise<LoadedModule>[] = [];
        try {
                for (const moduleConfig of moduleConfigs) {
                        loadedModules.push(loadSingle(moduleConfig));
                }
        } catch (e) {
                generalLogger.write(SeverityEnum.error, logArea, `Error loading modules from config file: ${e}`);
        }

        return Promise.all(loadedModules);
}

const getModuleConfigs = async (configFilePath?: string): Promise<ModuleConfig[]> => {
        try {
                const filePath: string = configFilePath
                        ? configFilePath
                        : (await generalConfig.get()).moduleConfigPath;

                if (!fileUtil.doesPathExist(filePath)) {
                        generalLogger.write(SeverityEnum.error, logArea, `Module configuration file at path '${filePath}' not found`);
                        return [];
                }

                const jsonText = await fs.readFile(filePath);
                return JSON.parse(jsonText.toString());
        } catch (e) {
                generalLogger.write(SeverityEnum.error, logArea, `Error get module configuration from file: ${e}`);
                return [];
        }
}

/*========================================================================================*/

export {
        load,
        loadSingle,
        getModuleConfigs,
};

