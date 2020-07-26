export type EventType = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir' | 'ready' | 'raw' | 'error' | 'none';

export const shouldEventBeIgnored = (event: EventType, eventsToListenFor: EventType[]): boolean => {
    if (!event || event === 'none' || !eventsToListenFor || eventsToListenFor.length === 0) return false;
    return !eventsToListenFor.includes(event as EventType);
}

