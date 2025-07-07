import { EventEmitter } from 'events';
import { HookOrchestrator } from '../core/hook-orchestrator.js';
export interface ExecutorOptions {
    shell?: string;
    cwd?: string;
    env?: Record<string, string>;
    enableMonitoring?: boolean;
    hookOrchestrator?: HookOrchestrator;
}
/**
 * CommandExecutor - Executes actual commands instead of calling Claude recursively
 */
export declare class CommandExecutor extends EventEmitter {
    private options;
    private pty?;
    private output;
    private isComplete;
    private hookOrchestrator?;
    constructor(options?: ExecutorOptions);
    execute(prompt: string, systemPrompt: string, taskId: string, streamHandler?: (data: string) => void): Promise<string>;
    private executePrompt;
    kill(): void;
    getOutput(): string;
    isRunning(): boolean;
}
//# sourceMappingURL=command-executor.d.ts.map