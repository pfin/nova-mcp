export interface StreamingExecuteOptions {
    timeout?: number;
    maxRetries?: number;
    workingDirectory?: string;
    env?: Record<string, string>;
    streamToParent?: boolean;
    parentTaskId?: string;
    taskPath?: string[];
}
export interface StreamingExecuteResult {
    success: boolean;
    output?: string;
    error?: string;
    duration: number;
    retries: number;
    streamId: string;
}
export declare class ClaudeCodeSubprocessStreaming {
    private defaultTimeout;
    private currentProcesses;
    constructor(options?: {
        timeout?: number;
    });
    execute(prompt: string, taskId: string, options?: StreamingExecuteOptions): Promise<StreamingExecuteResult>;
    private executeWithStreaming;
    private streamStatus;
    private streamProgress;
    private streamOutput;
    private streamError;
    private streamComplete;
    killAll(): Promise<void>;
    getActiveCount(): number;
}
//# sourceMappingURL=claude-subprocess-streaming.d.ts.map