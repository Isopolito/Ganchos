export type EventType = 'addFile' | 'addDir' | 'changeFile' | 'unlinkFile' | 'unlinkDir'
    | 'inetUp' | 'inetDown' | 'ipChange' | 'packetMatch' | 'none';

export const shouldEventBeIgnored = (event: EventType, eventsToListenFor: EventType[]): boolean => {
    if (!event || event === 'none') return false;
    
    return !eventsToListenFor || eventsToListenFor.length === 0
        || !eventsToListenFor.includes(event as EventType);
}
