import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface UsageMetrics {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  
  // Task metrics
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  retriedTasks: number;
  
  // Quality metrics
  averageQuality: number;
  highestQuality: number;
  lowestQuality: number;
  
  // Code generation metrics
  filesCreated: number;
  filesModified: number;
  linesOfCode: number;
  testsWritten: number;
  testsPassing: number;
  averageCoverage: number;
  
  // MCTS metrics
  totalIterations: number;
  averageTreeDepth: number;
  explorationRate: number;
  cacheHits: number;
  cacheMisses: number;
  
  // Performance metrics
  totalDuration: number;
  averageTaskDuration: number;
  fastestTask: number;
  slowestTask: number;
  
  // Task type breakdown
  taskTypes: Record<string, number>;
  
  // Error analysis
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

export class UsageAnalytics {
  private metrics: UsageMetrics;
  private taskReports: Map<string, TaskReport> = new Map();
  private analyticsDir: string;
  private currentLogFile: string;
  
  constructor(sessionId?: string) {
    this.analyticsDir = path.join(process.cwd(), 'analytics');
    this.ensureAnalyticsDir();
    
    this.metrics = this.initializeMetrics(sessionId);
    this.currentLogFile = path.join(
      this.analyticsDir, 
      `session-${this.metrics.sessionId}.json`
    );
    
    // Load existing session if available
    if (fs.existsSync(this.currentLogFile)) {
      const existing = JSON.parse(fs.readFileSync(this.currentLogFile, 'utf-8'));
      this.metrics = existing.metrics;
      this.taskReports = new Map(Object.entries(existing.taskReports));
    }
  }
  
  private initializeMetrics(sessionId?: string): UsageMetrics {
    return {
      sessionId: sessionId || this.generateSessionId(),
      startTime: new Date(),
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      retriedTasks: 0,
      averageQuality: 0,
      highestQuality: 0,
      lowestQuality: 1,
      filesCreated: 0,
      filesModified: 0,
      linesOfCode: 0,
      testsWritten: 0,
      testsPassing: 0,
      averageCoverage: 0,
      totalIterations: 0,
      averageTreeDepth: 0,
      explorationRate: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalDuration: 0,
      averageTaskDuration: 0,
      fastestTask: Infinity,
      slowestTask: 0,
      taskTypes: {},
      errorTypes: {},
      commonFailures: [],
    };
  }
  
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private ensureAnalyticsDir(): void {
    if (!fs.existsSync(this.analyticsDir)) {
      fs.mkdirSync(this.analyticsDir, { recursive: true });
    }
  }
  
  /**
   * Track task start
   */
  taskStarted(taskId: string, prompt: string, taskType: string, depth: number = 0): void {
    this.taskReports.set(taskId, {
      taskId,
      prompt,
      taskType,
      status: 'failed', // Default to failed until completed
      quality: 0,
      duration: 0,
      depth,
      attempts: 1,
    });
    
    this.metrics.totalTasks++;
    this.metrics.taskTypes[taskType] = (this.metrics.taskTypes[taskType] || 0) + 1;
    this.save();
  }
  
  /**
   * Track task completion
   */
  taskCompleted(
    taskId: string, 
    quality: number, 
    duration: number,
    implementation?: TaskReport['implementation'],
    mctsStats?: TaskReport['mctsStats']
  ): void {
    const report = this.taskReports.get(taskId);
    if (!report) return;
    
    report.status = 'completed';
    report.quality = quality;
    report.duration = duration;
    report.implementation = implementation;
    report.mctsStats = mctsStats;
    
    // Update metrics
    this.metrics.completedTasks++;
    this.updateQualityMetrics(quality);
    this.updateDurationMetrics(duration);
    
    if (implementation) {
      this.metrics.filesCreated += implementation.filesCreated.length;
      this.metrics.filesModified += implementation.filesModified.length;
      this.metrics.linesOfCode += implementation.linesAdded;
      this.metrics.testsWritten += implementation.testsCreated;
      this.metrics.testsPassing += implementation.testsPassing;
      this.updateCoverageMetrics(implementation.coverage);
    }
    
    if (mctsStats) {
      this.metrics.totalIterations += mctsStats.iterations;
      this.updateTreeDepthMetrics(mctsStats.treeDepth);
      this.updateExplorationRate(mctsStats.explorationRate);
    }
    
    this.save();
  }
  
  /**
   * Track task failure
   */
  taskFailed(taskId: string, error: string, duration: number): void {
    const report = this.taskReports.get(taskId);
    if (!report) return;
    
    report.status = 'failed';
    report.duration = duration;
    
    this.metrics.failedTasks++;
    this.updateDurationMetrics(duration);
    
    // Track error types
    const errorType = this.classifyError(error);
    this.metrics.errorTypes[errorType] = (this.metrics.errorTypes[errorType] || 0) + 1;
    
    // Track common failures
    if (!this.metrics.commonFailures.includes(error.substring(0, 100))) {
      this.metrics.commonFailures.push(error.substring(0, 100));
      if (this.metrics.commonFailures.length > 10) {
        this.metrics.commonFailures.shift();
      }
    }
    
    this.save();
  }
  
  /**
   * Track task retry
   */
  taskRetried(taskId: string): void {
    const report = this.taskReports.get(taskId);
    if (!report) return;
    
    report.attempts++;
    this.metrics.retriedTasks++;
    this.save();
  }
  
  /**
   * Track cache performance
   */
  cacheHit(): void {
    this.metrics.cacheHits++;
  }
  
  cacheMiss(): void {
    this.metrics.cacheMisses++;
  }
  
  /**
   * Generate usage report
   */
  generateReport(format: 'summary' | 'detailed' | 'json' = 'summary'): string {
    this.metrics.endTime = new Date();
    this.metrics.totalDuration = this.metrics.endTime.getTime() - this.metrics.startTime.getTime();
    
    if (format === 'json') {
      return JSON.stringify({
        metrics: this.metrics,
        taskReports: Object.fromEntries(this.taskReports),
      }, null, 2);
    }
    
    if (format === 'summary') {
      return this.generateSummaryReport();
    }
    
    return this.generateDetailedReport();
  }
  
  private generateSummaryReport(): string {
    const successRate = this.metrics.totalTasks > 0 
      ? (this.metrics.completedTasks / this.metrics.totalTasks * 100).toFixed(1)
      : '0.0';
    
    const cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(1)
      : '0.0';
    
    return `
# Axiom MCP Usage Report - Summary

**Session ID**: ${this.metrics.sessionId}
**Duration**: ${this.formatDuration(this.metrics.totalDuration)}

## Task Statistics
- Total Tasks: ${this.metrics.totalTasks}
- Completed: ${this.metrics.completedTasks} (${successRate}%)
- Failed: ${this.metrics.failedTasks}
- Retried: ${this.metrics.retriedTasks}

## Quality Metrics
- Average Quality: ${this.metrics.averageQuality.toFixed(3)}
- Highest: ${this.metrics.highestQuality.toFixed(3)}
- Lowest: ${this.metrics.lowestQuality.toFixed(3)}

## Code Generation
- Files Created: ${this.metrics.filesCreated}
- Files Modified: ${this.metrics.filesModified}
- Lines of Code: ${this.metrics.linesOfCode}
- Tests Written: ${this.metrics.testsWritten}
- Tests Passing: ${this.metrics.testsPassing}
- Average Coverage: ${this.metrics.averageCoverage.toFixed(1)}%

## Performance
- Average Task Duration: ${this.formatDuration(this.metrics.averageTaskDuration)}
- Fastest Task: ${this.formatDuration(this.metrics.fastestTask)}
- Slowest Task: ${this.formatDuration(this.metrics.slowestTask)}
- Cache Hit Rate: ${cacheHitRate}%

## MCTS Statistics
- Total Iterations: ${this.metrics.totalIterations}
- Average Tree Depth: ${this.metrics.averageTreeDepth.toFixed(1)}
- Exploration Rate: ${this.metrics.explorationRate.toFixed(3)}
`;
  }
  
  private generateDetailedReport(): string {
    let report = this.generateSummaryReport();
    
    // Add task type breakdown
    report += '\n## Task Type Breakdown\n';
    for (const [type, count] of Object.entries(this.metrics.taskTypes)) {
      const percentage = (count / this.metrics.totalTasks * 100).toFixed(1);
      report += `- ${type}: ${count} (${percentage}%)\n`;
    }
    
    // Add error analysis
    if (Object.keys(this.metrics.errorTypes).length > 0) {
      report += '\n## Error Analysis\n';
      for (const [error, count] of Object.entries(this.metrics.errorTypes)) {
        report += `- ${error}: ${count}\n`;
      }
    }
    
    // Add top tasks
    const sortedTasks = Array.from(this.taskReports.values())
      .sort((a, b) => b.quality - a.quality)
      .slice(0, 5);
    
    report += '\n## Top Quality Tasks\n';
    for (const task of sortedTasks) {
      report += `- ${task.prompt.substring(0, 50)}... (Quality: ${task.quality.toFixed(3)})\n`;
    }
    
    return report;
  }
  
  /**
   * Save analytics to disk
   */
  private save(): void {
    const data = {
      metrics: this.metrics,
      taskReports: Object.fromEntries(this.taskReports),
    };
    
    fs.writeFileSync(this.currentLogFile, JSON.stringify(data, null, 2));
  }
  
  /**
   * Create visual analytics dashboard
   */
  createDashboard(): string {
    const successRate = this.metrics.totalTasks > 0 
      ? this.metrics.completedTasks / this.metrics.totalTasks
      : 0;
    
    const dashboard = `
╔════════════════════════════════════════════════════════════════════════════╗
║                         AXIOM MCP ANALYTICS DASHBOARD                       ║
╠════════════════════════════════════════════════════════════════════════════╣
║ Session: ${this.metrics.sessionId.padEnd(50)} ║
║ Runtime: ${this.formatDuration(this.metrics.totalDuration).padEnd(50)} ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                TASK METRICS                                 ║
╠════════════════════════════════════════════════════════════════════════════╣
║ Success Rate: ${this.createProgressBar(successRate, 40)} ${(successRate * 100).toFixed(1)}%      ║
║ Quality Avg:  ${this.createProgressBar(this.metrics.averageQuality, 40)} ${this.metrics.averageQuality.toFixed(3)}     ║
║ Coverage:     ${this.createProgressBar(this.metrics.averageCoverage / 100, 40)} ${this.metrics.averageCoverage.toFixed(1)}%     ║
╠════════════════════════════════════════════════════════════════════════════╣
║                              CODE GENERATION                                ║
╠════════════════════════════════════════════════════════════════════════════╣
║ Files:  ${String(this.metrics.filesCreated + this.metrics.filesModified).padEnd(8)} │ Tests: ${String(this.metrics.testsWritten).padEnd(8)} │ LOC: ${String(this.metrics.linesOfCode).padEnd(12)} ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                MCTS METRICS                                 ║
╠════════════════════════════════════════════════════════════════════════════╣
║ Iterations: ${String(this.metrics.totalIterations).padEnd(10)} │ Avg Depth: ${String(this.metrics.averageTreeDepth.toFixed(1)).padEnd(8)} │ Explore: ${String(this.metrics.explorationRate.toFixed(3)).padEnd(8)} ║
╚════════════════════════════════════════════════════════════════════════════╝
`;
    
    return dashboard;
  }
  
  private createProgressBar(value: number, width: number): string {
    const filled = Math.round(value * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
  
  private formatDuration(ms: number): string {
    if (ms === Infinity) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }
  
  private updateQualityMetrics(quality: number): void {
    const total = this.metrics.averageQuality * (this.metrics.completedTasks - 1) + quality;
    this.metrics.averageQuality = total / this.metrics.completedTasks;
    this.metrics.highestQuality = Math.max(this.metrics.highestQuality, quality);
    this.metrics.lowestQuality = Math.min(this.metrics.lowestQuality, quality);
  }
  
  private updateDurationMetrics(duration: number): void {
    const total = this.metrics.averageTaskDuration * (this.metrics.totalTasks - 1) + duration;
    this.metrics.averageTaskDuration = total / this.metrics.totalTasks;
    this.metrics.fastestTask = Math.min(this.metrics.fastestTask, duration);
    this.metrics.slowestTask = Math.max(this.metrics.slowestTask, duration);
  }
  
  private updateCoverageMetrics(coverage: number): void {
    const total = this.metrics.averageCoverage * (this.metrics.testsWritten - 1) + coverage;
    this.metrics.averageCoverage = total / this.metrics.testsWritten;
  }
  
  private updateTreeDepthMetrics(depth: number): void {
    const iterations = this.metrics.totalIterations;
    const total = this.metrics.averageTreeDepth * (iterations - 1) + depth;
    this.metrics.averageTreeDepth = total / iterations;
  }
  
  private updateExplorationRate(rate: number): void {
    const iterations = this.metrics.totalIterations;
    const total = this.metrics.explorationRate * (iterations - 1) + rate;
    this.metrics.explorationRate = total / iterations;
  }
  
  private classifyError(error: string): string {
    if (error.includes('timeout')) return 'Timeout';
    if (error.includes('syntax')) return 'Syntax Error';
    if (error.includes('test')) return 'Test Failure';
    if (error.includes('verification')) return 'Verification Failed';
    if (error.includes('connection')) return 'Connection Error';
    if (error.includes('implementation')) return 'No Implementation';
    return 'Other';
  }
}

// Global analytics instance
export const analytics = new UsageAnalytics();