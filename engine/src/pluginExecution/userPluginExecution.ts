import path from "path"
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { performance } from 'perf_hooks';
import {
    UserPlugin, pluginConfig, EventType, pluginLogger,
    SeverityEnum, systemUtil, osUtil, shouldEventBeIgnored
} from "ganchos-shared"

type CommandType = 'cmd' | 'bat' | 'nixShell' | 'exe' | 'nixEx';

const logArea = "userPluginExecute";

const getCommandType = (binFileName: string): CommandType => {
    if (binFileName.endsWith('.cmd')) return 'cmd';
    if (binFileName.endsWith('.bat')) return 'bat';
    if (binFileName.endsWith('.exe')) return 'exe';
    if (binFileName.match(/.(sh|zsh|tcsh)$/)) return 'nixShell';

    return 'nixEx';
}

const makeCommandParams = async (jsonConfig: string, userPlugin: UserPlugin, event: string, eventData: string): Promise<string[]> => {
    const config = jsonConfig || userPlugin.defaultJsonConfig;
    return [`"${config}"`, `"${event}"`, `"${eventData}"`];
}

const getStandardSpawn = async (jsonConfig: string, userPlugin: UserPlugin, event: string, eventData: string): Promise<ChildProcessWithoutNullStreams> => {
    return spawn(`"${path.join(userPlugin.path, userPlugin.binFileName)}"`, await makeCommandParams(jsonConfig, userPlugin, event, eventData));
}

const getScriptSpawn = async (jsonConfig: string, userPlugin: UserPlugin, event: EventType, eventData: string): Promise<ChildProcessWithoutNullStreams> => {
    return spawn(`"${path.join(userPlugin.path, userPlugin.binFileName)}"`, await makeCommandParams(jsonConfig, userPlugin, event, eventData), { shell: true });
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

const executeNoTimer = async (userPlugin: UserPlugin, event: EventType, eventData: string): Promise<void> => {
    let spawned: ChildProcessWithoutNullStreams;
    try {
        if (shouldEventBeIgnored(event, userPlugin.eventTypes)) return;
        if (!osUtil.shouldNotRunOnThisOs(userPlugin.runOnlyOnOsTypes)) return;

        const config = await pluginConfig.get(userPlugin.name, true) || userPlugin.defaultJsonConfig;
        const configObj = JSON.parse(config);

        if (configObj !== undefined && configObj.enabled === false) return;

        await systemUtil.waitInMinutes(configObj.runDelayInMinutes || 0);

        switch (getCommandType(userPlugin.binFileName)) {
            case 'cmd':
            case 'nixShell':
            case 'bat':
                spawned = await getScriptSpawn(config, userPlugin, event, eventData);
                break;
            case 'exe':
            case 'nixEx':
                spawned = await getStandardSpawn(config, userPlugin, event, eventData);
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
        pluginLogger.write(SeverityEnum.error, userPlugin.name, logArea, e);
    } finally {
        (spawned as any) = null;
    }
}

const execute = async (userPlugin: UserPlugin, event: EventType, eventData: string): Promise<void> => {
    const beforeTime = performance.now();
    await executeNoTimer(userPlugin, event, eventData);
    const afterTime = performance.now();
    await pluginLogger.write(SeverityEnum.info, userPlugin.name, logArea, `Executed in ${(afterTime - beforeTime).toFixed(2)}ms`);
}

export {
    execute,
}