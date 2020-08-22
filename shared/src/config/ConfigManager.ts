import { promises as fsPromises } from 'fs';
import queue from 'queue';
import fs from 'fs';

import { generalLogger, SeverityEnum, validationUtil, systemUtil, fileUtil } from '..';

export class ConfigManager {
    private configInMemory: any;
    private consumerName: string;
    private readonly saveQueue: queue;
    private readonly configFilePath: string;
    private jsonConfigInMemory: string | null;
    private configInMemoryLastUpdated: number;

    constructor(configFilePath: string, defaultJsonConfig: string | null, consumerName: string = configFilePath) {
        this.configInMemory = {};
        this.jsonConfigInMemory = null;
        this.consumerName = consumerName;
        this.configInMemoryLastUpdated = 0;
        this.configFilePath = configFilePath;
        this.saveQueue = queue({ results: [], concurrency: 1, autostart: true, timeout: 5000 });

        if (!fileUtil.doesPathExist(configFilePath)) {
            fileUtil.touch(configFilePath);
            if (defaultJsonConfig) fs.writeFileSync(this.configFilePath, defaultJsonConfig);
        }
    }

    private async isConfigInMemoryMostRecent(): Promise<Boolean> {
        try {
            if (!this.configInMemory) return false;
            if (!fileUtil.doesPathExist(this.configFilePath)) return true;

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

    async getJson(): Promise<string | null> {
        try {
            if (await this.isConfigInMemoryMostRecent()) return this.jsonConfigInMemory;

            this.updateStateFromDisk();
            return this.jsonConfigInMemory;
        } catch (e) {
            await generalLogger.write(SeverityEnum.error, `${ConfigManager.name} - getJson`, `[${this.consumerName}] Exception - ${e}`);
            return null;
        }
    }

    async getFromMemory(makeClone: boolean = true): Promise<any> {
        return makeClone ? systemUtil.deepClone(this.configInMemory) : this.configInMemory;
    }

    async get(makeClone: boolean = true): Promise<any> {
        try {
            if (await this.isConfigInMemoryMostRecent()) this.getFromMemory(makeClone);

            this.updateStateFromDisk();
            return await this.getFromMemory(makeClone);
        } catch (e) {
            await generalLogger.write(SeverityEnum.error, `${ConfigManager.name} - get`, `[${this.consumerName}] Exception - ${e}`);
        }
    }

    async set(configObj: any | null): Promise<void> {
        try {
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