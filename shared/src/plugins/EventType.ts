export type EventType = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir' | 'ready' | 'raw' | 'error' | 'none';

export const shouldEventBeIgnored = (event: string, eventsToListenFor: EventType[]): boolean => {
    if (!eventsToListenFor || eventsToListenFor.length === 0) return false;
    return !eventsToListenFor.includes(event as EventType);
}

