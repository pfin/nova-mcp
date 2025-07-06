/**
 * PTY Executor for Claude CLI
 *
 * Based on expert recommendations from GoodIdeasFromOtherModels.txt:
 * - Uses node-pty to create pseudo-terminal
 * - Implements heartbeat to prevent 30s timeout
 * - Streams output character by character
 * - Allows stdin injection for intervention
 */
import { EventEmitter } from 'events';
export interface PtyExecutorOptions {
    cwd?: string;
    env?: Record<string, string>;
    cols?: number;
    rows?: number;
    heartbeatInterval?: number;
    enableMonitoring?: boolean;
    enableIntervention?: boolean;
    onExecutorCreated?: (executor: PtyExecutor) => void;
}
export interface ExecutorEvent {
    taskId: string;
    timestamp: number;
    type: 'data' | 'exit' | 'error' | 'heartbeat';
    payload: any;
}
export declare class PtyExecutor extends EventEmitter {
    private options;
    private ptyProcess;
    private outputBuffer;
    private heartbeatTimer;
    private isRunning;
    private streamInterceptor;
    constructor(options?: PtyExecutorOptions);
    execute(command: string, args: string[], taskId: string): Promise<void>;
    /**
     * Write data to the PTY stdin
     * Used for intervention and interaction
     */
    write(data: string): void;
    /**
     * Start heartbeat to prevent Claude CLI timeout
     * Based on expert recommendation: send zero-width char every 3 minutes
     */
    private startHeartbeat;
    /**
     * Stop the heartbeat timer
     */
    private stopHeartbeat;
    /**
     * Force kill the process
     */
    kill(): void;
    /**
     * Get the accumulated output buffer
     */
    getOutput(): string;
    /**
     * Get violation report if monitoring is enabled
     */
    getViolations(): any[];
    /**
     * Force an intervention with a custom message
     */
    forceIntervention(message: string): void;
    /**
     * Check if process is running
     */
    isActive(): boolean;
}
//# sourceMappingURL=pty-executor.d.ts.map