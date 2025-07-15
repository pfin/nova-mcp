export declare class DebugLogger {
    private static instance;
    private logFile;
    private buffer;
    private flushTimer?;
    private constructor();
    static getInstance(): DebugLogger;
    log(component: string, message: string, data?: any): Promise<void>;
    private startFlushTimer;
    flush(): Promise<void>;
    getLogFile(): string;
    shutdown(): Promise<void>;
}
export declare const debugLog: DebugLogger;
//# sourceMappingURL=debug-logger.d.ts.map