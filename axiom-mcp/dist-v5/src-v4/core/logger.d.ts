/**
 * Enhanced logging system for Axiom v4
 * Provides maximum visibility into all operations
 */
export declare enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    FATAL = 5
}
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    component: string;
    method: string;
    message: string;
    data?: any;
    duration?: number;
    taskId?: string;
}
export declare class Logger {
    private static instance;
    private logLevel;
    private startTimes;
    private silent;
    static getInstance(): Logger;
    private constructor();
    setLogLevel(level: LogLevel): void;
    private shouldLog;
    private formatMessage;
    private colorize;
    trace(component: string, method: string, message: string, data?: any, taskId?: string): void;
    debug(component: string, method: string, message: string, data?: any, taskId?: string): void;
    info(component: string, method: string, message: string, data?: any, taskId?: string): void;
    warn(component: string, method: string, message: string, data?: any, taskId?: string): void;
    error(component: string, method: string, message: string, data?: any, taskId?: string): void;
    fatal(component: string, method: string, message: string, data?: any, taskId?: string): void;
    startTimer(key: string): void;
    endTimer(key: string): number | undefined;
    private log;
    logStream(component: string, taskId: string, data: string, metadata?: any): void;
    logHook(hookName: string, event: string, phase: 'start' | 'end', result?: any): void;
    logMetrics(component: string, metrics: Record<string, number>): void;
}
//# sourceMappingURL=logger.d.ts.map