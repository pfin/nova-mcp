/**
 * Interactive Controller for Real-Time Task Management
 * 
 * Allows users to interrupt, guide, and control tasks as they execute
 */

import { EventEmitter } from 'events';
import { PtyExecutor } from '../executors/pty-executor.js';
import { ClaudeCodeSubprocessV3 } from '../claude-subprocess-v3.js';

export interface InteractiveControllerOptions {
  enableRealTimeControl: boolean;
  allowMidExecutionInjection: boolean;
  pauseOnViolation: boolean;
  requireApprovalFor: string[]; // e.g., ['file_deletion', 'api_calls', 'database_changes']
}

export class InteractiveController extends EventEmitter {
  private executors: Map<string, PtyExecutor> = new Map();
  private pausedTasks: Set<string> = new Set();
  private pendingApprovals: Map<string, PendingApproval> = new Map();
  private injectionQueue: Map<string, string[]> = new Map();
  
  constructor(private options: InteractiveControllerOptions) {
    super();
  }
  
  /**
   * Register an executor for interactive control
   */
  registerExecutor(taskId: string, executor: PtyExecutor) {
    this.executors.set(taskId, executor);
    
    // Set up violation handler
    executor.on('violation', (event) => {
      if (this.options.pauseOnViolation) {
        this.pauseTask(taskId, `Violation detected: ${event.payload.ruleName}`);
      }
    });
    
    // Set up tool call interception
    executor.on('tool_call_pending', (event) => {
      if (this.requiresApproval(event.payload.tool)) {
        this.requestApproval(taskId, event.payload);
      }
    });
  }
  
  /**
   * Inject instruction/guidance into running task
   */
  injectGuidance(taskId: string, guidance: string) {
    const executor = this.executors.get(taskId);
    if (!executor) {
      throw new Error(`No executor found for task ${taskId}`);
    }
    
    // Format as a system message that Claude will see
    const injection = `

🔔 USER GUIDANCE: ${guidance}

Please acknowledge this guidance and adjust your approach accordingly.

`;
    
    // If task is running, inject immediately
    if (!this.pausedTasks.has(taskId)) {
      executor.write(injection);
      this.emit('guidance_injected', { taskId, guidance, timestamp: new Date() });
    } else {
      // Queue for when task resumes
      if (!this.injectionQueue.has(taskId)) {
        this.injectionQueue.set(taskId, []);
      }
      this.injectionQueue.get(taskId)!.push(injection);
    }
  }
  
  /**
   * Pause task execution
   */
  pauseTask(taskId: string, reason?: string) {
    const executor = this.executors.get(taskId);
    if (!executor || this.pausedTasks.has(taskId)) return;
    
    this.pausedTasks.add(taskId);
    
    // Send pause signal
    executor.write('\x13'); // Ctrl+S (XOFF) to pause output
    
    this.emit('task_paused', { 
      taskId, 
      reason: reason || 'User requested pause',
      timestamp: new Date() 
    });
  }
  
  /**
   * Resume task execution
   */
  resumeTask(taskId: string) {
    const executor = this.executors.get(taskId);
    if (!executor || !this.pausedTasks.has(taskId)) return;
    
    this.pausedTasks.delete(taskId);
    
    // Inject any queued guidance
    const queued = this.injectionQueue.get(taskId);
    if (queued && queued.length > 0) {
      queued.forEach(msg => executor.write(msg));
      this.injectionQueue.delete(taskId);
    }
    
    // Send resume signal
    executor.write('\x11'); // Ctrl+Q (XON) to resume output
    
    this.emit('task_resumed', { taskId, timestamp: new Date() });
  }
  
  /**
   * Abort task with explanation
   */
  abortTask(taskId: string, reason: string) {
    const executor = this.executors.get(taskId);
    if (!executor) return;
    
    // Send abort message
    const abortMsg = `

🛑 TASK ABORTED BY USER

Reason: ${reason}

Please stop all current operations and provide a summary of:
1. What was completed
2. What was in progress
3. Any cleanup needed

`;
    
    executor.write(abortMsg);
    
    // Give time for response, then kill
    setTimeout(() => {
      executor.kill();
      this.executors.delete(taskId);
    }, 5000);
    
    this.emit('task_aborted', { taskId, reason, timestamp: new Date() });
  }
  
  /**
   * Redirect task to new approach
   */
  redirectTask(taskId: string, newDirection: string) {
    const redirect = `

🔄 TASK REDIRECTION

The user has requested a change in approach:

${newDirection}

Please:
1. Acknowledge this redirection
2. Explain how you'll adjust your approach
3. Continue with the new direction

`;
    
    this.injectGuidance(taskId, redirect);
  }
  
  /**
   * Request approval for sensitive operations
   */
  private requestApproval(taskId: string, operation: any) {
    const approvalId = `${taskId}-${Date.now()}`;
    
    const approval: PendingApproval = {
      id: approvalId,
      taskId,
      operation,
      timestamp: new Date(),
      status: 'pending'
    };
    
    this.pendingApprovals.set(approvalId, approval);
    this.pauseTask(taskId, `Approval required for ${operation.tool}`);
    
    this.emit('approval_required', approval);
  }
  
  /**
   * Approve or deny pending operation
   */
  handleApproval(approvalId: string, approved: boolean, modifications?: any) {
    const approval = this.pendingApprovals.get(approvalId);
    if (!approval || approval.status !== 'pending') return;
    
    approval.status = approved ? 'approved' : 'denied';
    
    if (approved) {
      let message = `✅ Operation approved: ${approval.operation.tool}`;
      if (modifications) {
        message += `\nWith modifications: ${JSON.stringify(modifications)}`;
        // Inject modifications
        this.injectGuidance(approval.taskId, `Use these modified parameters: ${JSON.stringify(modifications)}`);
      }
      this.injectGuidance(approval.taskId, message);
    } else {
      this.injectGuidance(approval.taskId, `❌ Operation denied: ${approval.operation.tool}. Please try a different approach.`);
    }
    
    this.resumeTask(approval.taskId);
    this.emit('approval_handled', { approvalId, approved });
  }
  
  /**
   * Check if operation requires approval
   */
  private requiresApproval(toolName: string): boolean {
    return this.options.requireApprovalFor.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(toolName);
      }
      return toolName === pattern;
    });
  }
  
  /**
   * Get current status of all tasks
   */
  getStatus(): TaskStatus[] {
    const statuses: TaskStatus[] = [];
    
    for (const [taskId, executor] of this.executors) {
      statuses.push({
        taskId,
        paused: this.pausedTasks.has(taskId),
        pendingApprovals: Array.from(this.pendingApprovals.values())
          .filter(a => a.taskId === taskId && a.status === 'pending')
          .length,
        queuedInjections: this.injectionQueue.get(taskId)?.length || 0,
        isActive: executor.isActive()
      });
    }
    
    return statuses;
  }
  
  /**
   * Provide contextual help based on current task state
   */
  provideContextualHelp(taskId: string, context: string) {
    const help = `

💡 CONTEXTUAL HELP

Based on the current context: ${context}

Here are some suggestions:
${this.generateContextualSuggestions(context)}

Feel free to ask for clarification if needed.

`;
    
    this.injectGuidance(taskId, help);
  }
  
  /**
   * Generate suggestions based on context
   */
  private generateContextualSuggestions(context: string): string {
    // Pattern matching for common scenarios
    if (/database|schema|migration/i.test(context)) {
      return `
- Ensure foreign key constraints are properly defined
- Add indexes for frequently queried columns
- Consider using transactions for data integrity
- Test rollback procedures`;
    }
    
    if (/test|testing/i.test(context)) {
      return `
- Write tests for edge cases
- Mock external dependencies
- Ensure proper cleanup after tests
- Check test coverage`;
    }
    
    if (/error|exception|fail/i.test(context)) {
      return `
- Check the full error stack trace
- Verify all dependencies are installed
- Check file permissions
- Look for typos in variable/function names`;
    }
    
    return `
- Break down the problem into smaller steps
- Verify your assumptions
- Check documentation for the tools you're using
- Consider alternative approaches`;
  }
}

// Interfaces
interface PendingApproval {
  id: string;
  taskId: string;
  operation: any;
  timestamp: Date;
  status: 'pending' | 'approved' | 'denied';
}

interface TaskStatus {
  taskId: string;
  paused: boolean;
  pendingApprovals: number;
  queuedInjections: number;
  isActive: boolean;
}

// Integration with ClaudeCodeSubprocessV3
export function enhanceWithInteractiveControl(
  claudeSubprocess: ClaudeCodeSubprocessV3,
  controller: InteractiveController
) {
  const originalExecute = claudeSubprocess.execute.bind(claudeSubprocess);
  
  claudeSubprocess.execute = async function(prompt: string, options?: any) {
    const taskId = options?.taskId || `task-${Date.now()}`;
    
    // Create enhanced options
    const enhancedOptions = {
      ...options,
      enableMonitoring: true,
      enableIntervention: true,
      onExecutorCreated: (executor: PtyExecutor) => {
        controller.registerExecutor(taskId, executor);
      }
    };
    
    return originalExecute(prompt, enhancedOptions);
  };
}