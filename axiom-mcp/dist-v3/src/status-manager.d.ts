export interface TaskStatus {
    id: string;
    prompt: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    duration?: number;
    output?: string;
    error?: string;
    childTasks?: string[];
    parentTask?: string;
    depth: number;
    temporalStartTime?: string;
    temporalEndTime?: string;
    taskType?: string;
    taskTypeId?: string;
    validationPassed?: boolean;
    validationIssues?: string[];
    goalId?: string;
    systemPrompt?: string;
    mctsStats?: {
        visits: number;
        totalReward: number;
        averageReward: number;
        untriedActions: string[];
        simulationMode?: 'fast' | 'full' | 'mixed';
        lastVisited?: Date;
    };
}
export interface SystemStatus {
    totalTasks: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
    activeSessions: Map<string, TaskStatus[]>;
    lastUpdated: Date;
}
export declare class StatusManager {
    private tasks;
    private logsDir;
    private statusFile;
    private contextDir;
    constructor(baseDir?: string);
    addTask(task: TaskStatus): void;
    updateTask(id: string, updates: Partial<TaskStatus>): void;
    getTask(id: string): TaskStatus | undefined;
    getAllTasks(): TaskStatus[];
    getSystemStatus(): SystemStatus;
    getRecentCommands(limit?: number): TaskStatus[];
    /**
     * Get most recent N tasks with optional filters
     */
    getMostRecentTasks(limit?: number, filters?: {
        status?: TaskStatus['status'];
        taskType?: string;
        hasErrors?: boolean;
        minDepth?: number;
        maxDepth?: number;
        parentTask?: string;
    }): TaskStatus[];
    /**
     * Get tasks within a time window using temporal data
     */
    getTasksInTimeWindow(startDate: string, endDate: string): TaskStatus[];
    getTaskTree(rootId: string): any;
    saveContext(taskId: string, context: any): void;
    loadContext(taskId: string): any;
    private log;
    private saveStatus;
    private loadStatus;
    clearOldTasks(daysToKeep?: number): void;
}
//# sourceMappingURL=status-manager.d.ts.map