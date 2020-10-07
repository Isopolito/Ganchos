import queue from 'queue';
import { promises as fsPromises } from 'fs';

import * as systemUtil from '../util/system'
import { doesPathExist } from '../util/files';
import * as validationUtil from '../util/validation'
import { SeverityEnum } from '../logging/SeverityEnum';

// Initializer called on first execution or if config file is removed
// TODO: Maybe this should not be called if config file is removed? Currently only useful for testing
type Initializer = () => Promise<void>;
type Logger = (severity: SeverityEnum, area: string, msg: string) => void;

export class ConfigManager {
    private readonly saveQueue: queue;
    private readonly logger: Logger;
    private readonly initializer: Initializer;
    private readonly configFilePath: string;
    private configInMemory: any;
    private consumerName: string;
    private jsonConfigInMemory: string | null;
    private configInMemoryLastUpdated: number;
    private haveRanInitializer: boolean;

    constructor(configFilePath: string, logger: Logger, initializer: Initializer, consumerName: string = configFilePath) {
        this.configInMemory = {};
        this.jsonConfigInMemory = null;
        this.consumerName = consumerName;
        this.configInMemoryLastUpdated = 0;
        this.configFilePath = configFilePath;
        this.saveQueue = queue({ results: [], concurrency: 1, autostart: true, timeout: 5000 });
        this.logger = logger;
        this.initializer = initializer;
        this.haveRanInitializer = false;
    }

    private async runInitializerIfNeeded(): Promise<void> {
        if (this.haveRanInitializer && doesPathExist(this.configFilePath)) return;

        await this.initializer();
        this.haveRanInitializer = true;
    }

    private async isConfigInMemoryCurrent(): Promise<Boolean> {
        try {
            if (systemUtil.isObjectEmpty(this.configInMemory)) return false;

            const stats = await fsPromises.stat(this.configFilePath);

            // Stats time is when the file was last modified. If that is less than the time stamp on what's in memory,
            // that means it was updated before the version in memory was updated so the in-mem version is current.
            return stats.mtime.getTime() <= this.configInMemoryLastUpdated
        } catch (e) {
            this.logger(SeverityEnum.error, `${ConfigManager.name} - isConfigInMemoryMostRecent`, `[${this.consumerName}] Exception - ${e}`);
            return false;
        }
    }

    private async updateStateFromDisk(): Promise<void> {
        try {
            const rawData = await fsPromises.readFile(this.configFilePath);
            const jsonConfig = rawData.toString();
            const config = validationUtil.parseAndValidateJson(jsonConfig, true);
            if (!config) {
                this.logger(SeverityEnum.error, `${ConfigManager.name} - updateStateFromDisk`, `[${this.consumerName}] JSON in file ${this.configFilePath} is invalid.`);
                return;
            }

            this.configInMemory = config;
            this.jsonConfigInMemory = jsonConfig;
            this.configInMemoryLastUpdated = Date.now();
        } catch (e) {
            this.logger(SeverityEnum.error, `${ConfigManager.name} - updateStateFromDisk`, `[${this.consumerName}] Exception - ${e}`);
        }
    }
     
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    async getJson(): Promise<string | null> {
        try {
            await this.runInitializerIfNeeded();
            if (await this.isConfigInMemoryCurrent()) return this.jsonConfigInMemory;

            await this.updateStateFromDisk();
            return this.jsonConfigInMemory;
        } catch (e) {
            this.logger(SeverityEnum.error, `${ConfigManager.name} - getJson`, `[${this.consumerName}] Exception - ${e}`);
            return null;
        }
    }

    async getFromMemory(makeClone: boolean = true): Promise<any|null> {
        try {
            await this.runInitializerIfNeeded();
            if (systemUtil.isObjectEmpty(this.configInMemory)) await this.updateStateFromDisk();

            return makeClone ? systemUtil.deepClone(this.configInMemory) : this.configInMemory;
        } catch (e) {
            this.logger(SeverityEnum.error, `${ConfigManager.name} - getFromMemory`, `[${this.consumerName}] Exception - ${e}`);
            return null;
        }
    }

    async get(makeClone: boolean = true): Promise<any|null> {
        try {
            await this.runInitializerIfNeeded();
            if (await this.isConfigInMemoryCurrent()) this.getFromMemory(makeClone);

            await this.updateStateFromDisk();
            return await this.getFromMemory(makeClone);
        } catch (e) {
            this.logger(SeverityEnum.error, `${ConfigManager.name} - get`, `[${this.consumerName}] Exception - ${e}`);
            return null;
        }
    }

    async set(configObj: any | null): Promise<void> {
        try {
            await this.runInitializerIfNeeded();
            if (!configObj) return;

            // Ensure back-to-back calls to save file to disk always happen sequentially--FIFO
            this.saveQueue.push(async () => {
                this.configInMemory = systemUtil.deepClone(configObj);
                this.jsonConfigInMemory = JSON.stringify(this.configInMemory, null, 4);
                await fsPromises.writeFile(this.configFilePath, this.jsonConfigInMemory);
                this.configInMemoryLastUpdated = Date.now();
            });
        } catch (e) {
            this.logger(SeverityEnum.error, `${ConfigManager.name} - set`, `[${this.consumerName}] Exception - ${e}`);
        }
    }
}