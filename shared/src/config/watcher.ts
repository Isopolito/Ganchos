import chokidar from 'chokidar';
import * as differ from 'deep-diff';
import { promises as fsPromises } from 'fs';
import { SeverityEnum } from '../logging/SeverityEnum';
import { fileUtil } from '..';

type OnFileChangeHandler = (event: string, filePath: string, propsWithDiffs: string[]|null) => Promise<void>;
type GetConfigFromMemory = (filePath: string) => Promise<any>;
type Logger = (severity: SeverityEnum, area: string, msg: string) => void;

export class Watcher {
    private logger: Logger;
    private watchPath: string;
    private watcher: chokidar.FSWatcher | null;
    private getConfigFromMemory: GetConfigFromMemory;

    constructor(watchPath: string, getConfigFromMemory: GetConfigFromMemory, logger: Logger) {
        this.watcher = null;
        this.logger = logger;
        this.watchPath = watchPath;
        this.getConfigFromMemory = getConfigFromMemory;
    }

    private async diffBetweenFileAndMem(filePath: string): Promise<string[]> {
        try {
            const configInMemory = this.getConfigFromMemory(filePath);
            if (!configInMemory) return [];

            const rawData = await fsPromises.readFile(filePath);
            const fromFile = rawData.toString();
            if (!fromFile) return [];

            const diffs = differ.diff(JSON.parse(fromFile), configInMemory);
            if (!diffs) return [];

            return diffs.reduce((paths: any[], diff) => {
                if (diff.path) paths = paths.concat(diff.path);
                return paths;
            }, []);
        } catch (e) {
            this.logger(SeverityEnum.error, `${Watcher.name} - diffBetweenFileAndMem`, `Exception - ${e}`);
            return [];
        }
    }

    async beginWatch(onFileChangeHandler: OnFileChangeHandler): Promise<void> {
        try {
            if (!fileUtil.doesPathExist(this.watchPath)) {
                this.logger(SeverityEnum.error, `${Watcher.name} - beginWatch`, `Path '${this.watchPath}' does not exist. Skipping`);
                return;
            }

            this.logger(SeverityEnum.debug, `${Watcher.name} - beginWatch`, `watching path: ${this.watchPath}`);

            this.watcher = chokidar.watch(this.watchPath, {
                persistent: true,
                usePolling: false,
                ignoreInitial: true,
            });

            this.watcher.on('all', async (event: string, filePath: string) => onFileChangeHandler(event, filePath, await this.diffBetweenFileAndMem(filePath)));
            this.watcher.on('error', async error => this.logger(SeverityEnum.error, Watcher.name, `Error in watcher: ${error}`));
        } catch (e) {
            this.logger(SeverityEnum.error, `${Watcher.name} - beginWatch`, `Exception - ${e}`);
        }
    }

    async endWatch(): Promise<void> {
        try {
            if (this.watcher) {
                await this.watcher.close();
                this.watcher = null;
            }
        } catch (e) {
            this.logger(SeverityEnum.error, `${Watcher.name} - endWatch`, `Exception - ${e}`);
        }
    }
}