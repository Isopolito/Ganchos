import queue from 'queue';
import { promises as fsPromises } from 'fs';

import { generalLogger, SeverityEnum, validationUtil, fileUtil, systemUtil } from '..';

// Guaranteed to be called once
type Initializer = () => Promise<void>;

export class ConfigManager {
    private readonly saveQueue: queue;
    private readonly initializer: Initializer;
    private readonly configFilePath: string;
    private configInMemory: any;
    private consumerName: string;
    private jsonConfigInMemory: string | null;
    private configInMemoryLastUpdated: number;
    private haveRanInitializer: boolean;

    constructor(configFilePath: string, initializer: Initializer, consumerName: string = configFilePath) {
        this.configInMemory = {};
        this.jsonConfigInMemory = null;
        this.consumerName = consumerName;
        this.configInMemoryLastUpdated = 0;
        this.configFilePath = configFilePath;
        this.saveQueue = queue({ results: [], concurrency: 1, autostart: true, timeout: 5000 });
        this.initializer = initializer;
        this.haveRanInitializer = false;
    }

    private async runInitializerIfNeeded(): Promise<void> {
        if (this.haveRanInitializer) return;
        await this.initializer();
        this.haveRanInitializer = true;
    }

    private async isConfigInMemoryMostRecent(): Promise<Boolean> {
        try {
            if (!this.configInMemory) return false;

            const stats = await fsPromises.stat(this.configFilePath);

            // TODO: Write comment that explains this line
            return stats.mtime.getTime() >= this.configInMemoryLastUpdated
        } catch (e) {
            await generalLogger.write(SeverityEnum.error, `${ConfigManager.name} - isConfigInMemoryMostRecent`, `[${this.consumerName}] Exception - ${e}`);
            return false;
        }
    }

    private async updateStateFromDisk(): Promise<void> {
        try {
            const rawData = await fsPromises.readFile(this.configFilePath);
            const jsonConfig = rawData.toString();
            const config = validationUtil.parseAndValidateJson(jsonConfig, true);
            if (!config) {
                await generalLogger.write(SeverityEnum.error, `${ConfigManager.name} - updateStateFromDisk`, `[${this.consumerName}] JSON in file ${this.configFilePath} is invalid.`);
                return;
            }

            this.configInMemory = config;
            this.jsonConfigInMemory = jsonConfig;
            this.configInMemoryLastUpdated = Date.now();
        } catch (e) {
            await generalLogger.write(SeverityEnum.error, `${ConfigManager.name} - updateStateFromDisk`, `[${this.consumerName}] Exception - ${e}`);
        }
    }
     
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    async getJson(): Promise<string | null> {
        try {
            await this.runInitializerIfNeeded();
            if (await this.isConfigInMemoryMostRecent()) return this.jsonConfigInMemory;

            await this.updateStateFromDisk();
            return this.jsonConfigInMemory;
        } catch (e) {
            await generalLogger.write(SeverityEnum.error, `${ConfigManager.name} - getJson`, `[${this.consumerName}] Exception - ${e}`);
            return null;
        }
    }

    async getFromMemory(makeClone: boolean = true): Promise<any> {
        try {
            await this.runInitializerIfNeeded();
            return makeClone ? systemUtil.deepClone(this.configInMemory) : this.configInMemory;
        } catch (e) {
            await generalLogger.write(SeverityEnum.error, `${ConfigManager.name} - getFromMemory`, `[${this.consumerName}] Exception - ${e}`);
            return null;
        }
    }

    async get(makeClone: boolean = true): Promise<any> {
        try {
            await this.runInitializerIfNeeded();
            if (await this.isConfigInMemoryMostRecent()) this.getFromMemory(makeClone);

            await this.updateStateFromDisk();
            return await this.getFromMemory(makeClone);
        } catch (e) {
            await generalLogger.write(SeverityEnum.error, `${ConfigManager.name} - get`, `[${this.consumerName}] Exception - ${e}`);
        }
    }

    async set(configObj: any | null): Promise<void> {
        try {
            await this.runInitializerIfNeeded();
            if (!configObj) return;

            // Ensure calls to save file to disk always happen sequentially--FIFO
            this.saveQueue.push(async () => {
                this.configInMemory = systemUtil.deepClone(configObj);
                this.jsonConfigInMemory = JSON.stringify(this.configInMemory, null, 4);
                await fsPromises.writeFile(this.configFilePath, this.jsonConfigInMemory);
                this.configInMemoryLastUpdated = Date.now();
            });
        } catch (e) {
            await generalLogger.write(SeverityEnum.error, `${ConfigManager.name} - set`, `[${this.consumerName}] Exception - ${e}`);
        }
    }
}