export interface UsageMetrics {
    sessionId: string;
    startTime: Date;
    endTime?: Date;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    retriedTasks: number;
    averageQuality: number;
    highestQuality: number;
    lowestQuality: number;
    filesCreated: number;
    filesModified: number;
    linesOfCode: number;
    testsWritten: number;
    testsPassing: number;
    averageCoverage: number;
    totalIterations: number;
    averageTreeDepth: number;
    explorationRate: number;
    cacheHits: number;
    cacheMisses: number;
    totalDuration: number;
    averageTaskDuration: number;
    fastestTask: number;
    slowestTask: number;
    taskTypes: Record<string, number>;
    errorTypes: Record<string, number>;
    commonFailures: string[];
}
export interface TaskReport {
    taskId: string;
    prompt: string;
    taskType: string;
    status: 'completed' | 'failed';
    quality: number;
    duration: number;
    depth: number;
    attempts: number;
    implementation?: {
        filesCreated: string[];
        filesModified: string[];
        linesAdded: number;
        testsCreated: number;
        testsPassing: number;
        coverage: number;
    };
    mctsStats?: {
        iterations: number;
        treeDepth: number;
        bestReward: number;
        explorationRate: number;
    };
}
export declare class UsageAnalytics {
    private metrics;
    private taskReports;
    private analyticsDir;
    private currentLogFile;
    constructor(sessionId?: string);
    private initializeMetrics;
    private generateSessionId;
    private ensureAnalyticsDir;
    /**
     * Track task start
     */
    taskStarted(taskId: string, prompt: string, taskType: string, depth?: number): void;
    /**
     * Track task completion
     */
    taskCompleted(taskId: string, quality: number, duration: number, implementation?: TaskReport['implementation'], mctsStats?: TaskReport['mctsStats']): void;
    /**
     * Track task failure
     */
    taskFailed(taskId: string, error: string, duration: number): void;
    /**
     * Track task retry
     */
    taskRetried(taskId: string): void;
    /**
     * Track cache performance
     */
    cacheHit(): void;
    cacheMiss(): void;
    /**
     * Generate usage report
     */
    generateReport(format?: 'summary' | 'detailed' | 'json'): string;
    private generateSummaryReport;
    private generateDetailedReport;
    /**
     * Save analytics to disk
     */
    private save;
    /**
     * Create visual analytics dashboard
     */
    createDashboard(): string;
    private createProgressBar;
    private formatDuration;
    private updateQualityMetrics;
    private updateDurationMetrics;
    private updateCoverageMetrics;
    private updateTreeDepthMetrics;
    private updateExplorationRate;
    private classifyError;
}
export declare const analytics: UsageAnalytics;
//# sourceMappingURL=usage-analytics.d.ts.map