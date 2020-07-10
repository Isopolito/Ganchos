import { Subject, Observable } from "threads/observable"
import { PluginLogMessage } from "./PluginLogMessage";

export class PluginLogic {
    private subject: Subject<PluginLogMessage> = null;

    constructor() {
        this.subject = new Subject();
    }
        
    tearDown() {
        this.subject.complete();
        this.subject = null;
    }

    Log(logMessage: PluginLogMessage) {
        this.subject.next(logMessage);
    }

    getLogSubscription(): Observable<PluginLogMessage> {
        return Observable.from(this.subject);
    }
}