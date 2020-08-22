import chokidar from 'chokidar';
import * as differ from 'deep-diff';
import { promises as fsPromises } from 'fs';
import { generalLogger, SeverityEnum } from '..';

type OnFileChangeHandler = (event: string, filePath: string, propsWithDiffs: string[]|null) => Promise<void>;
type GetConfigFromMemory = (filePath: string) => Promise<any>;

export class Watcher {
    private watchPath: string;
    private watcher: chokidar.FSWatcher | null;
    private getConfigFromMemory: GetConfigFromMemory;

    constructor(watchPath: string, getConfigFromMemory: GetConfigFromMemory) {
        this.watcher = null;
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
            await generalLogger.write(SeverityEnum.error, `${Watcher.name} - diffBetweenFileAndMem`, `Exception - ${e}`);
            return [];
        }
    }

    async beginWatch(onFileChangeHandler: OnFileChangeHandler): Promise<void> {
        try {
            this.watcher = chokidar.watch(this.watchPath, {
                persistent: true,
                usePolling: false,
                ignoreInitial: true,
            });

            this.watcher.on('all', async (event: string, filePath: string) => onFileChangeHandler(event, filePath, await this.diffBetweenFileAndMem(filePath)));
            this.watcher.on('error', async error => await generalLogger.write(SeverityEnum.error, Watcher.name, `Error in watcher: ${error}`));
        } catch (e) {
            await generalLogger.write(SeverityEnum.error, `${Watcher.name} - beginWatch`, `Exception - ${e}`);
        }
    }

    async endWatch(): Promise<void> {
        try {
            if (this.watcher) {
                await this.watcher.close();
                this.watcher = null;
            }
        } catch (e) {
            await generalLogger.write(SeverityEnum.error, `${Watcher.name} - endWatch`, `Exception - ${e}`);
        }
    }
}