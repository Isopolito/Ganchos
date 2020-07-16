import { Subject, Observable } from "threads/observable"
import { PluginLogMessage } from '.';

export class GanchosPluginBaseLogic {
    private subject: Subject<PluginLogMessage>;

    constructor() {
        this.subject = new Subject();
    }
        
    tearDown() {
        this.subject.complete();
        (this.subject as any) = null;
    }

    Log(logMessage: PluginLogMessage) {
        this.subject.next(logMessage);
    }

    getLogSubscription(): Observable<PluginLogMessage> {
        return Observable.from(this.subject);
    }
}