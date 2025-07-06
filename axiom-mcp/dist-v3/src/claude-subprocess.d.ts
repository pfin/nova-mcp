import { VerificationProof } from './system-verification.js';
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
export declare class ClaudeCodeSubprocess {
    private options;
    private defaultOptions;
    constructor(options?: ClaudeCodeOptions);
    /**
     * Execute a prompt using claude -p
     * Using execSync for more reliable execution
     */
    execute(prompt: string, customOptions?: ClaudeCodeOptions): Promise<ClaudeCodeResult>;
    /**
     * Execute a prompt asynchronously using exec (for true parallelism)
     */
    executeAsync(prompt: string, customOptions?: ClaudeCodeOptions): Promise<ClaudeCodeResult>;
    /**
     * Execute multiple prompts in parallel
     * Uses async execution for true parallelism
     */
    executeParallel(prompts: {
        id: string;
        prompt: string;
        options?: ClaudeCodeOptions;
    }[]): Promise<ClaudeCodeResult[]>;
}
//# sourceMappingURL=claude-subprocess.d.ts.map