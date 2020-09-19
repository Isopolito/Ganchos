export type EventType = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir' | 'ready'
    | 'raw' | 'error' | 'inetUp' | 'inetDown' | 'ipChange' | 'none';

export const shouldEventBeIgnored = (event: EventType, eventsToListenFor: EventType[]): boolean => {
    return !event || event === 'none' || !eventsToListenFor || eventsToListenFor.length === 0
        ? false
        : !eventsToListenFor.includes(event as EventType);
}
