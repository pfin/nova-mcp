/**
 * Implementation Monitor
 *
 * Tracks actual implementation metrics and prevents false completion claims.
 * This is the core of fixing Axiom MCP's fundamental issue.
 */
import { TaskStatus } from './status-manager.js';
export interface ImplementationMetrics {
    taskId: string;
    taskPrompt: string;
    timestamp: Date;
    claimedStatus: string;
    claimedOutput: string;
    actualCodeFiles: number;
    actualTestFiles: number;
    actualLinesOfCode: number;
    actualTestsRun: boolean;
    actualTestsPassed: boolean;
    isDeceptive: boolean;
    verificationReport: string;
}
export interface ImplementationReport {
    totalTasks: number;
    implementedTasks: number;
    deceptiveTasks: number;
    successRate: number;
    fileMetrics: {
        totalFilesCreated: number;
        totalLinesOfCode: number;
        avgLinesPerTask: number;
    };
    testMetrics: {
        tasksWithTests: number;
        tasksWithPassingTests: number;
        testSuccessRate: number;
    };
    deceptivePatterns: Array<{
        pattern: string;
        count: number;
        examples: string[];
    }>;
}
export declare class ImplementationMonitor {
    private metrics;
    private readonly dataFile;
    private readonly DECEPTIVE_PATTERNS;
    constructor(dataDir?: string);
    private loadMetrics;
    private saveMetrics;
    /**
     * Monitor a task completion and gather real metrics
     */
    monitorTaskCompletion(task: TaskStatus, filesBeforeTask: Set<string>, processesRun: Array<any>): Promise<ImplementationMetrics>;
    /**
     * Generate comprehensive implementation report
     */
    generateReport(): ImplementationReport;
    /**
     * Generate visual dashboard
     */
    generateDashboard(): string;
    private getAllFiles;
    private isCodeFile;
    private isTestFile;
}
export declare const globalMonitor: ImplementationMonitor;
//# sourceMappingURL=implementation-monitor.d.ts.map