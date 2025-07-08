/**
 * Process-based Executor - Inspired by DesktopCommander's approach
 * Uses child_process.spawn() directly with PID tracking
 */
import { EventEmitter } from 'events';
import { HookOrchestrator } from '../core/hook-orchestrator.js';
export declare class ProcessExecutor extends EventEmitter {
    private sessions;
    private hookOrchestrator?;
    private logger;
    private taskToPid;
    constructor(options?: {
        hookOrchestrator?: HookOrchestrator;
    });
    execute(prompt: string, systemPrompt: string, taskId: string, streamHandler?: (data: string) => void): Promise<string>;
    /**
     * Send input to a running process
     */
    write(message: string): void;
    /**
     * Send input to a specific task
     */
    writeToTask(taskId: string, message: string): void;
    interrupt(): void;
    kill(): void;
    getActiveSessionCount(): number;
}
//# sourceMappingURL=process-executor.d.ts.map