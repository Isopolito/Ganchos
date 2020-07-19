import { UserPlugin, pluginConfig, EventType, pluginLogger, SeverityEnum } from "ganchos-shared"
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path"

type CommandType = 'cmd' | 'bat' | 'nixShell' | 'exe' | 'nixEx';

const getCommandType = (binFileName: string): CommandType => {
    if (binFileName.endsWith('.cmd')) return 'cmd'; 
    if (binFileName.endsWith('.bat')) return 'bat'; 
    if (binFileName.endsWith('.exe')) return 'exe'; 
    if (binFileName.match(/.(sh|zsh|tcsh)$/)) return 'nixShell'; 

    return 'nixEx';
}

const makeCommandParams = (userPlugin: UserPlugin, event: string, filePath: string): string[] => {
    const config = pluginConfig.get(userPlugin.name, true) || userPlugin.defaultJsonConfig;
    return [config, event, filePath];
}

const getStandardSpawn = (userPlugin: UserPlugin, event: string, filePath: string): ChildProcessWithoutNullStreams => {
    return spawn(`"${path.join(userPlugin.path, userPlugin.binFileName)}"`, makeCommandParams(userPlugin, event, filePath));
}

const getWindowsBatchAndCmdSpawn = (userPlugin: UserPlugin, event: EventType, filePath: string): ChildProcessWithoutNullStreams => {
    return spawn(`"${path.join(userPlugin.path, userPlugin.binFileName)}"`, makeCommandParams(userPlugin, event, filePath), { shell: true });
}

const execute = async (userPlugin: UserPlugin, event: EventType, filePath: string): Promise<void> => {
    let spawned: ChildProcessWithoutNullStreams;
    switch (getCommandType(userPlugin.binFileName)) {
        case 'cmd':
        case 'bat':
            spawned = getWindowsBatchAndCmdSpawn(userPlugin, event, filePath);
            break;
        case 'exe':
        case 'nixEx':
        case 'nixShell':
            spawned = getStandardSpawn(userPlugin, event, filePath);
            break;
    }

    spawned.stdout.on('data', data => {
        const messageParts = data.split('|*|');
        pluginLogger.write(SeverityEnum.info, userPlugin.name,
            messageParts && messageParts.length === 2 ? messageParts[0] : 'n/a',
            messageParts && messageParts.length === 2 ? messageParts[1] : data);
    });

    spawned.stderr.on('data', data => {
        const messageParts = data.split('|*|');
        pluginLogger.write(SeverityEnum.error, userPlugin.name,
            messageParts && messageParts.length === 2 ? messageParts[0] : 'n/a',
            messageParts && messageParts.length === 2 ? messageParts[1] : data);
    });

// TODO: Measure and log plugin run time 
//    spwaned.on('close', (code) => {
//        console.log(`child process exited with code ${code}`);
//    });
}

export {
    execute,
}