/**
 * Axiom v5 - Parallel Executor
 * Manages multiple Claude instances running in parallel
 * Aggressively kills non-productive instances
 */
import { EventEmitter } from 'events';
interface PtyExecutor {
    execute(prompt: string, systemPrompt: string, taskId: string, streamHandler?: (data: string) => void): Promise<string>;
    write(data: string): void;
    interrupt(): void;
    kill(): void;
}
export interface ParallelTask {
    id: string;
    prompt: string;
    priority: number;
    dependencies?: string[];
    status: 'pending' | 'running' | 'completed' | 'failed' | 'killed';
    assignedInstance?: string;
    result?: string;
    error?: string;
    startTime?: number;
    endTime?: number;
    outputLines: number;
    lastActivity: number;
    filesCreated: string[];
}
export interface ClaudeInstance {
    id: string;
    executor: PtyExecutor;
    workspaceDir: string;
    status: 'idle' | 'busy' | 'dead';
    currentTask?: ParallelTask;
    output: string;
    startTime: number;
    lastActivity: number;
    productivityScore: number;
    filesCreated: Set<string>;
    linesOutput: number;
    idleTime: number;
}
export interface ParallelExecutorOptions {
    maxInstances?: number;
    workspaceRoot?: string;
    killIdleAfterMs?: number;
    killUnproductiveAfterMs?: number;
    minProductivityScore?: number;
    enableAggressiveKilling?: boolean;
}
export declare class ParallelExecutor extends EventEmitter {
    private instances;
    private taskQueue;
    private completedTasks;
    private failedTasks;
    private options;
    private monitorInterval?;
    private workspaceWatcher?;
    killedInstances: Set<string>;
    maxParallel: number;
    constructor(options?: ParallelExecutorOptions);
    /**
     * Execute tasks in parallel
     */
    execute(tasks: ParallelTask[]): Promise<Map<string, string>>;
    /**
     * Spawn a new Claude instance
     */
    private spawnInstance;
    /**
     * Assign next available task to instance
     */
    private assignNextTask;
    /**
     * Handle stream data from instance
     */
    private handleStreamData;
    /**
     * Update instance productivity score
     */
    private updateProductivityScore;
    /**
     * Start monitoring instances
     */
    private startMonitoring;
    /**
     * Stop monitoring
     */
    private stopMonitoring;
    /**
     * Kill an instance
     */
    private killInstance;
    /**
     * Get current status
     */
    getStatus(): any;
    /**
     * Send message to specific instance
     */
    sendToInstance(instanceId: string, message: string): boolean;
    /**
     * Interrupt specific instance
     */
    interruptInstance(instanceId: string): boolean;
    /**
     * Shutdown all instances
     */
    shutdown(): Promise<void>;
    /**
     * Execute tasks in parallel (V5 interface)
     */
    executeTasks(tasks: Array<{
        id: string;
        prompt: string;
        expectedFiles?: string[];
    }>, options?: {
        workspaceBase?: string;
        timeout?: number;
        productivityThreshold?: number;
    }): Promise<void>;
    /**
     * Get all results (V5 interface)
     */
    getAllResults(): Map<string, any>;
    /**
     * Get all instances (V5 interface)
     */
    getAllInstances(): Array<any>;
    /**
     * Kill a specific instance by ID (V5 interface - public wrapper)
     */
    killInstanceById(instanceId: string, reason: string): void;
    /**
     * Cleanup (V5 interface)
     */
    cleanup(): Promise<void>;
}
/**
 * Task decomposer - breaks complex tasks into parallel chunks
 */
export declare class TaskDecomposer {
    /**
     * Decompose a complex task into parallel subtasks
     */
    static decompose(prompt: string, strategy?: 'orthogonal' | 'dependency'): ParallelTask[];
}
export {};
//# sourceMappingURL=parallel-executor.d.ts.map