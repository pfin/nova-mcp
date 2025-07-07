/**
 * Claude Subprocess v3 - Uses PTY instead of execSync
 *
 * CRITICAL IMPROVEMENTS:
 * - No more 30-second timeout
 * - Real-time streaming output
 * - Heartbeat prevents any timeout
 * - Maintains v1 API compatibility
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
    /**
     * Execute a prompt using PTY instead of execSync
     * Maintains API compatibility with v1
     */
    execute(prompt: string, customOptions?: ClaudeCodeOptions): Promise<ClaudeCodeResult>;
    /**
     * Execute with streaming output (for tools that need real-time feedback)
     */
    executeStreaming(prompt: string, onData: (data: string) => void, customOptions?: ClaudeCodeOptions): Promise<ClaudeCodeResult>;
}
//# sourceMappingURL=claude-subprocess-v3.d.ts.map