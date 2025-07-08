export interface EventLogEntry {
    timestamp: string;
    taskId: string;
    workerId: string;
    event: string;
    payload: any;
}
export declare class EventBus {
    private logStream?;
    private logPath;
    private hookOrchestrator?;
    constructor(logsDir?: string);
    setHookOrchestrator(orchestrator: any): void;
    initialize(): Promise<void>;
    logEvent(entry: EventLogEntry): Promise<void>;
    getRecentEvents(limit?: number): Promise<EventLogEntry[]>;
    searchEvents(filter: {
        taskId?: string;
        event?: string;
        startTime?: string;
        endTime?: string;
    }): Promise<EventLogEntry[]>;
    getEventStats(): Promise<Record<string, number>>;
    close(): Promise<void>;
}
//# sourceMappingURL=event-bus.d.ts.map