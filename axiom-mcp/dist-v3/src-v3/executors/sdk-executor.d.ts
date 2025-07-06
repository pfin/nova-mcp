/**
 * SDK Executor for Claude Code
 *
 * Based on expert recommendations from GoodIdeasFromChatGPTo3.txt:
 * - Uses @anthropic-ai/claude-code SDK for streaming
 * - Handles non-interactive tasks efficiently
 * - Provides structured event output
 */
import { type SDKMessage } from '@anthropic-ai/claude-code';
import { EventEmitter } from 'events';
export interface SdkExecutorOptions {
    cwd?: string;
    maxTurns?: number;
    systemPrompt?: string;
}
export declare class SdkExecutor extends EventEmitter {
    private options;
    private isRunning;
    private messages;
    constructor(options?: SdkExecutorOptions);
    execute(prompt: string, taskId: string): Promise<void>;
    /**
     * Get all messages from the conversation
     */
    getMessages(): SDKMessage[];
    /**
     * Get the final response
     */
    getFinalResponse(): string;
    /**
     * Check if executor is running
     */
    isActive(): boolean;
    /**
     * Get result summary
     */
    getResultSummary(): any;
}
//# sourceMappingURL=sdk-executor.d.ts.map