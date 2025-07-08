/**
 * Working Implementation Controller
 * 
 * Based on research findings:
 * 1. Use execSync with --dangerously-skip-permissions (works)
 * 2. Implement event ledger for observability
 * 3. Add console watcher pattern
 * 4. Structure success criteria
 */

import { execSync } from 'child_process';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { SystemVerification } from './system-verification.js';
import { globalMonitor } from './implementation-monitor.js';
import * as fs from 'fs';

export interface ImplementationEvent {
  timestamp: string;
  taskId: string;
  agentId: string;
  type: 'prompt' | 'response' | 'verification' | 'error' | 'success';
  payload: any;
}

export interface TaskCriteria {
  filesCreated?: {
    min: number;
    extensions?: string[];
    required?: string[];
  };
  testsRun?: {
    required: boolean;
    command?: string;
  };
  testsPass?: {
    threshold: number; // 0.0 to 1.0
  };
  noExceptions?: boolean;
  customChecks?: Array<{
    name: string;
    command: string;
    expectedOutput?: string;
  }>;
}

export interface TaskEnvelope {
  taskId: string;
  description: string;
  criteria: TaskCriteria;
  maxAttempts: number;
  timeoutMs: number;
}

export class WorkingImplementationController extends EventEmitter {
  private eventLedger: ImplementationEvent[] = [];
  private readonly logFile: string;
  
  constructor() {
    super();
    this.logFile = `axiom-events-${Date.now()}.jsonl`;
  }
  
  /**
   * Log event to ledger and file
   */
  private logEvent(event: Omit<ImplementationEvent, 'timestamp'>) {
    const fullEvent: ImplementationEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };
    
    this.eventLedger.push(fullEvent);
    
    // Append to file
    fs.appendFileSync(this.logFile, JSON.stringify(fullEvent) + '\n');
    
    // Emit for real-time monitoring
    this.emit('event', fullEvent);
  }
  
  /**
   * Execute implementation task with full observability
   */
  async executeTask(task: TaskEnvelope): Promise<{
    success: boolean;
    attempts: number;
    events: ImplementationEvent[];
    finalVerification: any;
  }> {
    const agentId = uuidv4();
    const verification = new SystemVerification();
    
    this.logEvent({
      taskId: task.taskId,
      agentId,
      type: 'prompt',
      payload: { task }
    });
    
    let attempts = 0;
    let success = false;
    
    while (attempts < task.maxAttempts && !success) {
      attempts++;
      
      try {
        // Build prompt based on current state
        const prompt = this.buildPrompt(task, attempts, verification);
        
        this.logEvent({
          taskId: task.taskId,
          agentId,
          type: 'prompt',
          payload: { attempt: attempts, prompt }
        });
        
        // Execute with working approach
        const startTime = Date.now();
        const output = execSync(
          `claude --dangerously-skip-permissions -p "${prompt}"`,
          {
            encoding: 'utf-8',
            stdio: ['inherit', 'pipe', 'pipe'],
            timeout: task.timeoutMs,
            env: { ...process.env }
          }
        );
        
        const duration = Date.now() - startTime;
        
        this.logEvent({
          taskId: task.taskId,
          agentId,
          type: 'response',
          payload: { 
            output, 
            duration,
            outputLength: output.length 
          }
        });
        
        // Verify against criteria
        const verificationResult = this.verifyCriteria(task.criteria, verification);
        
        this.logEvent({
          taskId: task.taskId,
          agentId,
          type: 'verification',
          payload: verificationResult
        });
        
        if (verificationResult.allPassed) {
          success = true;
          this.logEvent({
            taskId: task.taskId,
            agentId,
            type: 'success',
            payload: { attempts, finalVerification: verificationResult }
          });
        } else {
          // Continue loop for next attempt
          this.emit('retry', { attempt: attempts, verification: verificationResult });
        }
        
      } catch (error: any) {
        this.logEvent({
          taskId: task.taskId,
          agentId,
          type: 'error',
          payload: { 
            error: error.message,
            stdout: error.stdout?.toString(),
            stderr: error.stderr?.toString()
          }
        });
      }
    }
    
    return {
      success,
      attempts,
      events: this.eventLedger.filter(e => e.taskId === task.taskId),
      finalVerification: verification.gatherProof()
    };
  }
  
  /**
   * Build prompt based on current state and previous attempts
   */
  private buildPrompt(task: TaskEnvelope, attempt: number, verification: SystemVerification): string {
    const proof = verification.gatherProof();
    
    if (attempt === 1) {
      // First attempt - clear instructions
      return `TASK: ${task.description}

Requirements:
${this.formatCriteria(task.criteria)}

Use these tools:
- Write: Create files with actual code
- Bash: Run commands
- Read: Read files

Do it now. Don't ask for permission.`;
    } else {
      // Subsequent attempts - be specific about what's missing
      const missing = this.getMissingRequirements(task.criteria, proof);
      
      return `Previous attempt incomplete. Current state:
- Files created: ${proof.filesCreated.length}
- Tests run: ${proof.processesRun.length}
- Tests passing: ${proof.testsPass}

Still missing:
${missing.join('\n')}

Complete the missing parts now.`;
    }
  }
  
  /**
   * Format criteria for prompt
   */
  private formatCriteria(criteria: TaskCriteria): string {
    const parts: string[] = [];
    
    if (criteria.filesCreated) {
      parts.push(`- Create at least ${criteria.filesCreated.min} files`);
      if (criteria.filesCreated.extensions) {
        parts.push(`  Extensions: ${criteria.filesCreated.extensions.join(', ')}`);
      }
      if (criteria.filesCreated.required) {
        parts.push(`  Required files: ${criteria.filesCreated.required.join(', ')}`);
      }
    }
    
    if (criteria.testsRun) {
      parts.push(`- Run tests${criteria.testsRun.command ? ` using: ${criteria.testsRun.command}` : ''}`);
    }
    
    if (criteria.testsPass) {
      parts.push(`- Tests must pass (${criteria.testsPass.threshold * 100}% threshold)`);
    }
    
    if (criteria.noExceptions) {
      parts.push('- No exceptions or errors in output');
    }
    
    return parts.join('\n');
  }
  
  /**
   * Get missing requirements
   */
  private getMissingRequirements(criteria: TaskCriteria, proof: any): string[] {
    const missing: string[] = [];
    
    if (criteria.filesCreated) {
      if (proof.filesCreated.length < criteria.filesCreated.min) {
        missing.push(`Need ${criteria.filesCreated.min - proof.filesCreated.length} more files`);
      }
      
      if (criteria.filesCreated.required) {
        const created = new Set(proof.filesCreated.map((f: any) => f.path));
        const missingFiles = criteria.filesCreated.required.filter(f => !created.has(f));
        if (missingFiles.length > 0) {
          missing.push(`Missing required files: ${missingFiles.join(', ')}`);
        }
      }
    }
    
    if (criteria.testsRun?.required && proof.processesRun.length === 0) {
      missing.push('No tests have been run yet');
    }
    
    if (criteria.testsPass && !proof.testsPass) {
      missing.push('Tests are not passing');
    }
    
    return missing;
  }
  
  /**
   * Verify against structured criteria
   */
  private verifyCriteria(criteria: TaskCriteria, verification: SystemVerification): any {
    const proof = verification.gatherProof();
    const results: any = {
      checks: {},
      allPassed: true
    };
    
    // Check file creation
    if (criteria.filesCreated) {
      const fileCheck = {
        required: criteria.filesCreated.min,
        actual: proof.filesCreated.length,
        passed: proof.filesCreated.length >= criteria.filesCreated.min
      };
      
      results.checks.filesCreated = fileCheck;
      if (!fileCheck.passed) results.allPassed = false;
      
      // Check required files
      if (criteria.filesCreated.required) {
        const created = new Set(proof.filesCreated.map((f: any) => f.path));
        const missingFiles = criteria.filesCreated.required.filter(f => !created.has(f));
        
        results.checks.requiredFiles = {
          missing: missingFiles,
          passed: missingFiles.length === 0
        };
        
        if (missingFiles.length > 0) results.allPassed = false;
      }
    }
    
    // Check test execution
    if (criteria.testsRun?.required) {
      results.checks.testsRun = {
        required: true,
        ran: proof.processesRun.length > 0,
        passed: proof.processesRun.length > 0
      };
      
      if (!results.checks.testsRun.passed) results.allPassed = false;
    }
    
    // Check test results
    if (criteria.testsPass) {
      results.checks.testsPass = {
        threshold: criteria.testsPass.threshold,
        passed: proof.testsPass
      };
      
      if (!proof.testsPass) results.allPassed = false;
    }
    
    // Check for exceptions
    if (criteria.noExceptions) {
      const hasExceptions = proof.processesRun.some((p: any) => 
        p.stderr.includes('Exception') || 
        p.stderr.includes('Error') ||
        p.exitCode !== 0
      );
      
      results.checks.noExceptions = {
        hasExceptions,
        passed: !hasExceptions
      };
      
      if (hasExceptions) results.allPassed = false;
    }
    
    return results;
  }
  
  /**
   * Get event summary for a task
   */
  getTaskSummary(taskId: string): any {
    const events = this.eventLedger.filter(e => e.taskId === taskId);
    
    return {
      taskId,
      totalEvents: events.length,
      eventTypes: events.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      duration: events.length > 0 ? 
        new Date(events[events.length - 1].timestamp).getTime() - 
        new Date(events[0].timestamp).getTime() : 0,
      success: events.some(e => e.type === 'success')
    };
  }
}

// Export singleton
export const workingController = new WorkingImplementationController();