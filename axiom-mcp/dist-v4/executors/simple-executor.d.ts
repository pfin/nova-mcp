/**
 * Simple executor for testing - simulates Claude execution
 */
import { EventEmitter } from 'events';
import { HookOrchestrator } from '../core/hook-orchestrator.js';
export declare class SimpleExecutor extends EventEmitter {
    private hookOrchestrator?;
    private logger;
    private currentLanguage;
    private interventionReceived;
    constructor(options?: {
        hookOrchestrator?: HookOrchestrator;
    });
    execute(prompt: string, systemPrompt: string, taskId: string, streamHandler?: (data: string) => void): Promise<string>;
    write(message: string): void;
    interrupt(): void;
    kill(): void;
}
//# sourceMappingURL=simple-executor.d.ts.map