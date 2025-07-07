/**
 * Event Logger for Axiom MCP v3
 * Logs all events to JSONL files for analysis
 */
export interface LogEvent {
    timestamp: number;
    type: string;
    [key: string]: any;
}
export declare class EventLogger {
    private logFile;
    private stream;
    constructor();
    logEvent(event: LogEvent): void;
    close(): void;
}
//# sourceMappingURL=event-logger.d.ts.map