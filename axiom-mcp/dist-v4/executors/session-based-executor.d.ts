/**
 * Session-Based Executor - Uses Claude Session Manager
 * This is what makes bidirectional communication possible
 */
import { EventEmitter } from 'events';
import { HookOrchestrator } from '../core/hook-orchestrator.js';
export declare class SessionBasedExecutor extends EventEmitter {
    private sessionManager;
    private hookOrchestrator?;
    private logger;
    private currentTaskId?;
    constructor(options?: {
        hookOrchestrator?: HookOrchestrator;
    });
    execute(prompt: string, systemPrompt: string, taskId: string, streamHandler?: (data: string) => void): Promise<string>;
    /**
     * Send a message to the running session
     * THIS is the key - we can send messages while Claude is working!
     */
    write(message: string): Promise<void>;
    interrupt(): void;
    kill(): void;
}
//# sourceMappingURL=session-based-executor.d.ts.map