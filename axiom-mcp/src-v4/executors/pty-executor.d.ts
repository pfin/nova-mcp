import { EventEmitter } from 'events';
import { HookOrchestrator } from '../core/hook-orchestrator.js';
export interface ExecutorOptions {
    shell?: string;
    cwd?: string;
    env?: Record<string, string>;
    enableMonitoring?: boolean;
    hookOrchestrator?: HookOrchestrator;
}
export declare class PtyExecutor extends EventEmitter {
    private options;
    private pty?;
    private output;
    private isComplete;
    private interventionQueue;
    private hookOrchestrator?;
    constructor(options?: ExecutorOptions);
    execute(prompt: string, systemPrompt: string, taskId: string, streamHandler?: (data: string) => void): Promise<string>;
    private idleTimer?;
    private resetIdleTimer;
    private heartbeat?;
    private startHeartbeat;
    injectCommand(command: string): void;
    write(data: string): void;
    interrupt(): void;
    kill(): void;
    getOutput(): string;
    isRunning(): boolean;
}
//# sourceMappingURL=pty-executor.d.ts.map