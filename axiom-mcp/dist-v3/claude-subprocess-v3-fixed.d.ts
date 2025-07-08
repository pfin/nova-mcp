/**
 * Fixed version of ClaudeCodeSubprocessV3 - resolves race condition
 */
import { VerificationProof } from './system-verification.js';
import { PtyExecutor } from './executors/pty-executor.js';
import { EventBus } from './core/event-bus.js';
export interface ClaudeCodeOptions {
    model?: string;
    allowedTools?: string[];
    disallowedTools?: string[];
    addDir?: string[];
    timeout?: number;
    systemPrompt?: string;
    taskType?: string;
    includeDate?: boolean;
    requireImplementation?: boolean;
    eventBus?: EventBus;
    enableMonitoring?: boolean;
    enableIntervention?: boolean;
    taskId?: string;
    title?: string;
    parentId?: string;
    depth?: number;
    onExecutorCreated?: (executor: PtyExecutor) => void;
}
export interface ClaudeCodeResult {
    id: string;
    prompt: string;
    response: string;
    error?: string;
    duration: number;
    timestamp: Date;
    startTime: string;
    endTime: string;
    taskType?: string;
    verification?: VerificationProof;
    verificationReport?: string;
}
export declare class ClaudeCodeSubprocessV3 {
    private options;
    private defaultOptions;
    private eventBus;
    constructor(options?: ClaudeCodeOptions);
    execute(prompt: string, customOptions?: ClaudeCodeOptions): Promise<ClaudeCodeResult>;
    /**
     * Execute with streaming output (for tools that need real-time feedback)
     */
    executeStreaming(prompt: string, onData: (data: string) => void, customOptions?: ClaudeCodeOptions): Promise<ClaudeCodeResult>;
    /**
     * Kill subprocess if running
     */
    kill(): void;
}
//# sourceMappingURL=claude-subprocess-v3-fixed.d.ts.map