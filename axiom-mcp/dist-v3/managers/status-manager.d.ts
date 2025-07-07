/**
 * Status Manager for Axiom MCP v3
 * Tracks task execution status and metadata
 */
export interface TaskStatus {
    id: string;
    prompt: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    temporalStartTime?: string;
    temporalEndTime?: string;
    depth: number;
    parentTask?: string;
    childTasks: string[];
    output?: string;
    error?: string;
    taskType: string;
    taskTypeId?: string;
    systemPrompt?: string;
    metadata?: {
        filesCreated?: string[];
        fileCount?: number;
        testsRun?: number;
        testsPassed?: number;
        [key: string]: any;
    };
}
export declare class StatusManager {
    private tasks;
    private taskOrder;
    addTask(task: TaskStatus): void;
    updateTask(taskId: string, updates: Partial<TaskStatus>): void;
    getTask(taskId: string): TaskStatus | undefined;
    getActiveTasks(): TaskStatus[];
    getRecentTasks(limit?: number): TaskStatus[];
    getStats(): {
        total: number;
        completed: number;
        failed: number;
        running: number;
        pending: number;
    };
    clear(): void;
}
//# sourceMappingURL=status-manager.d.ts.map