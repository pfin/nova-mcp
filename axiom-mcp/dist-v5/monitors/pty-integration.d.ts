/**
 * Integration between ThoughtMonitor and PTY Executor
 * Shows how to wire the monitor into Axiom MCP's execution flow
 */
import * as pty from 'node-pty';
import { DetectedThought, ThoughtMonitor, ThoughtPattern } from './thought-monitor';
export interface MonitoredPtyOptions {
    onInterrupt?: (detection: DetectedThought) => void;
    onWarning?: (detection: DetectedThought) => void;
    onSuccess?: (detection: DetectedThought) => void;
    autoInterrupt?: boolean;
    customPatterns?: ThoughtPattern[];
}
export declare class MonitoredPtyExecutor {
    private pty;
    private options;
    private monitor;
    private interruptCount;
    private successCount;
    private warningCount;
    constructor(pty: pty.IPty, options?: MonitoredPtyOptions);
    private setupMonitoring;
    private addCustomPatterns;
    private sendInterrupt;
    private sendCorrectiveMessage;
    /**
     * Send input to the PTY
     */
    write(data: string): void;
    /**
     * Get monitoring statistics
     */
    getStats(): {
        interrupts: number;
        warnings: number;
        successes: number;
        monitorStats: ReturnType<ThoughtMonitor['getStats']>;
    };
    /**
     * Clean up resources
     */
    destroy(): void;
}
/**
 * Factory function to create a monitored PTY process
 */
export declare function createMonitoredPty(command: string, args: string[], options?: MonitoredPtyOptions): {
    executor: MonitoredPtyExecutor;
    pty: pty.IPty;
};
/**
 * Example: Monitor a Claude execution with auto-intervention
 */
export declare function monitorClaudeTask(prompt: string): {
    executor: MonitoredPtyExecutor;
    pty: pty.IPty;
};
//# sourceMappingURL=pty-integration.d.ts.map