import path from "path"
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { UserPlugin, pluginConfig, EventType, pluginLogger, SeverityEnum } from "ganchos-shared"

type CommandType = 'cmd' | 'bat' | 'nixShell' | 'exe' | 'nixEx';

const getCommandType = (binFileName: string): CommandType => {
    if (binFileName.endsWith('.cmd')) return 'cmd';
    if (binFileName.endsWith('.bat')) return 'bat';
    if (binFileName.endsWith('.exe')) return 'exe';
    if (binFileName.match(/.(sh|zsh|tcsh)$/)) return 'nixShell';

    return 'nixEx';
}

const makeCommandParams = async (userPlugin: UserPlugin, event: string, filePath: string): Promise<string[]> => {
    const config = await pluginConfig.get(userPlugin.name, true) || userPlugin.defaultJsonConfig;
    return [`"${config}"`, `"${event}"`, `"${filePath}"`];
}

const getStandardSpawn = async (userPlugin: UserPlugin, event: string, filePath: string): Promise<ChildProcessWithoutNullStreams> => {
    return spawn(`"${path.join(userPlugin.path, userPlugin.binFileName)}"`, await makeCommandParams(userPlugin, event, filePath));
}

const getScriptSpawn = async (userPlugin: UserPlugin, event: EventType, filePath: string): Promise<ChildProcessWithoutNullStreams> => {
    return spawn(`"${path.join(userPlugin.path, userPlugin.binFileName)}"`, await makeCommandParams(userPlugin, event, filePath), { shell: true });
}

const prepareInputData = (data: any): string[] => {
    if (!data) return null;

    let dataString = data.toString();
    if (!dataString) return null;

    dataString = dataString.replace(/[\r\n]/, "");

    const messageParts = dataString.split('|*|');
    if (messageParts.length == 2) return messageParts;
    return ['n/a', dataString];
}

const execute = async (userPlugin: UserPlugin, event: EventType, filePath: string): Promise<void> => {
    try {
        let spawned: ChildProcessWithoutNullStreams;
        switch (getCommandType(userPlugin.binFileName)) {
            case 'cmd':
            case 'nixShell':
            case 'bat':
                spawned = await getScriptSpawn(userPlugin, event, filePath);
                break;
            case 'exe':
            case 'nixEx':
                spawned = await getStandardSpawn(userPlugin, event, filePath);
                break;
        }

        spawned.stdout.on('data', data => {
            const messageParts = prepareInputData(data);
            if (!messageParts) return;
            pluginLogger.write(SeverityEnum.info, userPlugin.name, messageParts[0], messageParts[1]);
        });

        spawned.stderr.on('data', data => {
            const messageParts = prepareInputData(data);
            if (!messageParts) return;
            pluginLogger.write(SeverityEnum.info, userPlugin.name, messageParts[0], messageParts[1]);
        });
    } catch (e) {
        pluginLogger.write(SeverityEnum.error, userPlugin.name, "execute", `Error running plugin: ${e}`);
    }
}

export {
    execute,
}