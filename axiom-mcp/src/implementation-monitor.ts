/**
 * Implementation Monitor
 * 
 * Tracks actual implementation metrics and prevents false completion claims.
 * This is the core of fixing Axiom MCP's fundamental issue.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { StatusManager, TaskStatus } from './status-manager.js';

export interface ImplementationMetrics {
  taskId: string;
  taskPrompt: string;
  timestamp: Date;
  
  // What was claimed
  claimedStatus: string;
  claimedOutput: string;
  
  // What actually happened
  actualCodeFiles: number;
  actualTestFiles: number;
  actualLinesOfCode: number;
  actualTestsRun: boolean;
  actualTestsPassed: boolean;
  
  // Verification
  isDeceptive: boolean;  // Claimed complete but didn't implement
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

export class ImplementationMonitor {
  private metrics: ImplementationMetrics[] = [];
  private readonly dataFile: string;
  
  // Patterns that indicate false completion
  private readonly DECEPTIVE_PATTERNS = [
    /once I have permission/i,
    /would need to/i,
    /you could/i,
    /here's how you would/i,
    /I'll need to/i,
    /would implement/i,
    /theoretical implementation/i,
    /approach would be/i,
    /plan to/i,
    /strategy for/i,
  ];
  
  constructor(dataDir: string = './axiom-metrics') {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dataFile = path.join(dataDir, 'implementation-metrics.json');
    this.loadMetrics();
  }
  
  private loadMetrics(): void {
    if (fs.existsSync(this.dataFile)) {
      try {
        const data = fs.readFileSync(this.dataFile, 'utf-8');
        this.metrics = JSON.parse(data);
      } catch (error) {
        console.error('[Monitor] Failed to load metrics:', error);
        this.metrics = [];
      }
    }
  }
  
  private saveMetrics(): void {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('[Monitor] Failed to save metrics:', error);
    }
  }
  
  /**
   * Monitor a task completion and gather real metrics
   */
  async monitorTaskCompletion(
    task: TaskStatus,
    filesBeforeTask: Set<string>,
    processesRun: Array<any>
  ): Promise<ImplementationMetrics> {
    // Get current files
    const currentFiles = new Set(this.getAllFiles(process.cwd()));
    const newFiles = Array.from(currentFiles).filter(f => !filesBeforeTask.has(f));
    
    // Analyze new files
    let codeFiles = 0;
    let testFiles = 0;
    let totalLines = 0;
    
    for (const file of newFiles) {
      if (this.isCodeFile(file)) {
        codeFiles++;
        const content = fs.readFileSync(file, 'utf-8');
        totalLines += content.split('\n').length;
        
        if (this.isTestFile(file)) {
          testFiles++;
        }
      }
    }
    
    // Check test execution
    const testProcesses = processesRun.filter(p => 
      /^(npm|yarn|pnpm|jest|mocha|pytest|go|cargo|mvn|gradle)\s+(test|spec)/.test(p.command)
    );
    const testsRun = testProcesses.length > 0;
    const testsPassed = testProcesses.some(p => p.exitCode === 0);
    
    // Check for deceptive patterns
    const output = task.output || '';
    const hasDeceptivePatterns = this.DECEPTIVE_PATTERNS.some(pattern => 
      pattern.test(output)
    );
    
    // Determine if task is deceptive
    const claimedComplete = task.status === 'completed';
    const actuallyImplemented = codeFiles > 0 || testFiles > 0;
    const isDeceptive = claimedComplete && !actuallyImplemented && hasDeceptivePatterns;
    
    // Create verification report
    let report = `Task: ${task.prompt}\n`;
    report += `Status: ${task.status}\n`;
    report += `Files Created: ${codeFiles} code, ${testFiles} test\n`;
    report += `Lines of Code: ${totalLines}\n`;
    report += `Tests Run: ${testsRun ? 'Yes' : 'No'}\n`;
    report += `Tests Passed: ${testsPassed ? 'Yes' : 'No'}\n`;
    
    if (isDeceptive) {
      report += `\n⚠️ DECEPTIVE COMPLETION DETECTED\n`;
      report += `Task marked as completed but no actual implementation found.\n`;
      const patterns = this.DECEPTIVE_PATTERNS.filter(p => p.test(output));
      report += `Deceptive patterns found: ${patterns.length}\n`;
    }
    
    const metrics: ImplementationMetrics = {
      taskId: task.id,
      taskPrompt: task.prompt,
      timestamp: new Date(),
      claimedStatus: task.status,
      claimedOutput: output,
      actualCodeFiles: codeFiles,
      actualTestFiles: testFiles,
      actualLinesOfCode: totalLines,
      actualTestsRun: testsRun,
      actualTestsPassed: testsPassed,
      isDeceptive,
      verificationReport: report,
    };
    
    this.metrics.push(metrics);
    this.saveMetrics();
    
    // Log warning for deceptive completions
    if (isDeceptive) {
      console.error(`[MONITOR] ⚠️ DECEPTIVE COMPLETION: Task ${task.id} claimed complete but wrote no code`);
    }
    
    return metrics;
  }
  
  /**
   * Generate comprehensive implementation report
   */
  generateReport(): ImplementationReport {
    const totalTasks = this.metrics.length;
    const implementedTasks = this.metrics.filter(m => 
      m.actualCodeFiles > 0 || m.actualTestFiles > 0
    ).length;
    const deceptiveTasks = this.metrics.filter(m => m.isDeceptive).length;
    
    // File metrics
    const totalFiles = this.metrics.reduce((sum, m) => sum + m.actualCodeFiles, 0);
    const totalLines = this.metrics.reduce((sum, m) => sum + m.actualLinesOfCode, 0);
    
    // Test metrics
    const tasksWithTests = this.metrics.filter(m => m.actualTestFiles > 0).length;
    const tasksWithPassingTests = this.metrics.filter(m => m.actualTestsPassed).length;
    
    // Analyze deceptive patterns
    const patternCounts = new Map<string, { count: number; examples: string[] }>();
    
    for (const metric of this.metrics.filter(m => m.isDeceptive)) {
      for (const pattern of this.DECEPTIVE_PATTERNS) {
        if (pattern.test(metric.claimedOutput)) {
          const key = pattern.source;
          if (!patternCounts.has(key)) {
            patternCounts.set(key, { count: 0, examples: [] });
          }
          const data = patternCounts.get(key)!;
          data.count++;
          if (data.examples.length < 3) {
            const match = metric.claimedOutput.match(pattern);
            if (match) {
              data.examples.push(match[0]);
            }
          }
        }
      }
    }
    
    const deceptivePatterns = Array.from(patternCounts.entries())
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        examples: data.examples,
      }))
      .sort((a, b) => b.count - a.count);
    
    return {
      totalTasks,
      implementedTasks,
      deceptiveTasks,
      successRate: totalTasks > 0 ? (implementedTasks / totalTasks) * 100 : 0,
      
      fileMetrics: {
        totalFilesCreated: totalFiles,
        totalLinesOfCode: totalLines,
        avgLinesPerTask: implementedTasks > 0 ? totalLines / implementedTasks : 0,
      },
      
      testMetrics: {
        tasksWithTests,
        tasksWithPassingTests,
        testSuccessRate: tasksWithTests > 0 ? (tasksWithPassingTests / tasksWithTests) * 100 : 0,
      },
      
      deceptivePatterns,
    };
  }
  
  /**
   * Generate visual dashboard
   */
  generateDashboard(): string {
    const report = this.generateReport();
    
    let dashboard = `
# Axiom MCP Implementation Dashboard

Generated: ${new Date().toISOString()}

## Overall Performance
- Total Tasks: ${report.totalTasks}
- Actually Implemented: ${report.implementedTasks} (${report.successRate.toFixed(1)}%)
- Deceptive Completions: ${report.deceptiveTasks} (${report.totalTasks > 0 ? ((report.deceptiveTasks / report.totalTasks) * 100).toFixed(1) : 0}%)

## Implementation Metrics
- Total Files Created: ${report.fileMetrics.totalFilesCreated}
- Total Lines of Code: ${report.fileMetrics.totalLinesOfCode}
- Average Lines per Task: ${report.fileMetrics.avgLinesPerTask.toFixed(0)}

## Test Coverage
- Tasks with Tests: ${report.testMetrics.tasksWithTests}
- Tasks with Passing Tests: ${report.testMetrics.tasksWithPassingTests}
- Test Success Rate: ${report.testMetrics.testSuccessRate.toFixed(1)}%

## Deceptive Pattern Analysis
${report.deceptivePatterns.length === 0 ? 'No deceptive patterns found! 🎉' : ''}
`;
    
    if (report.deceptivePatterns.length > 0) {
      dashboard += '\nTop deceptive patterns detected:\n';
      report.deceptivePatterns.slice(0, 5).forEach((pattern, i) => {
        dashboard += `\n${i + 1}. Pattern: "${pattern.pattern}"\n`;
        dashboard += `   Count: ${pattern.count} occurrences\n`;
        dashboard += `   Examples:\n`;
        pattern.examples.forEach(ex => {
          dashboard += `   - "${ex}"\n`;
        });
      });
    }
    
    // Success rate chart (ASCII)
    dashboard += '\n## Success Rate Visualization\n\n';
    const barLength = 50;
    const successBars = Math.round((report.successRate / 100) * barLength);
    const failBars = barLength - successBars;
    
    dashboard += 'Success: [' + '█'.repeat(successBars) + '░'.repeat(failBars) + `] ${report.successRate.toFixed(1)}%\n`;
    dashboard += 'Failure: [' + '█'.repeat(Math.round((report.deceptiveTasks / report.totalTasks) * barLength)) + 
                 '░'.repeat(barLength - Math.round((report.deceptiveTasks / report.totalTasks) * barLength)) + 
                 `] ${report.totalTasks > 0 ? ((report.deceptiveTasks / report.totalTasks) * 100).toFixed(1) : 0}%\n`;
    
    return dashboard;
  }
  
  private getAllFiles(dir: string): string[] {
    const files: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...this.getAllFiles(fullPath));
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore errors
    }
    return files;
  }
  
  private isCodeFile(filePath: string): boolean {
    return /\.(js|ts|jsx|tsx|py|java|go|rs|cpp|c|cs|rb|php)$/.test(filePath);
  }
  
  private isTestFile(filePath: string): boolean {
    return /\.(test|spec|tests)\./i.test(filePath);
  }
}

// Global monitor instance
export const globalMonitor = new ImplementationMonitor();