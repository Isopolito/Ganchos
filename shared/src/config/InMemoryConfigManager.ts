import * as differ from 'deep-diff';
import { generalLogger, SeverityEnum, validationUtil } from '..';

export type ConfigFromFileFetcher = (configName: string) => Promise<string|null>;

const defaultConfigName = 'config';

// Used for JSON config files to compare what's on disk verse what's in memory.
// This allows for consumers to know when a file they care about has been changed
// outside of ganchos--and specifically--what property(s) of the json in the file has changed.
export class InMemoryConfigManager {
    configFromFileFetcher: ConfigFromFileFetcher; 
    configsInMemory: { [key: string]: string };

    constructor(configFetcher: ConfigFromFileFetcher) {
        this.configsInMemory = {};
        this.configFromFileFetcher = configFetcher;
    }

    get(configName: string = defaultConfigName): string {
        return this.configsInMemory[configName];
    }

    set(configName: string|null, jsonConfig: string|null): void {
        if (!jsonConfig) return;

        configName = configName || defaultConfigName;
        if (!validationUtil.parseAndValidateJson(jsonConfig)) {
            generalLogger.writeSync(SeverityEnum.error,
                `${InMemoryConfigManager.name} - ${this.set.name}`,
                `Config for ${configName} invalid...not setting in memory config`);
        } else {
            this.configsInMemory[configName];
        }
    }

    initializeIfNeeded(configName: string|null, jsonString: string|null): void {
        if (!jsonString) return;

        configName = configName || defaultConfigName;
        if (!this.get(configName)) this.set(configName, jsonString);
    }

    async diffBetweenFileAndMem(configName: string = defaultConfigName): Promise<string[]> {
        try {
            const inMemoryConfig = this.get(configName);
            if (!inMemoryConfig) return [];

            const fromFile = await this.configFromFileFetcher(configName);
            if (!fromFile) return [];

            const diffs = differ.diff(JSON.parse(fromFile), JSON.parse(inMemoryConfig));
            if (!diffs) return [];

            return diffs.reduce((paths: any[], diff) => {
                if (diff.path) paths = paths.concat(diff.path);
                return paths;
            }, []);
        } catch (e) {
            generalLogger.writeSync(SeverityEnum.error, `${InMemoryConfigManager.name} - ${this.diffBetweenFileAndMem.name}`, `Exception - ${e}`);
        }

        return [];
    }
}