export type EventType = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir' | 'ready'
    | 'raw' | 'error' | 'inetUp' | 'inetDown' | 'ipChange' | 'none';

export const shouldEventBeIgnored = (event: EventType, eventsToListenFor: EventType[]): boolean => {
    if (!event || event === 'none') return false;
    
    return !eventsToListenFor || eventsToListenFor.length === 0
        || !eventsToListenFor.includes(event as EventType);
}
