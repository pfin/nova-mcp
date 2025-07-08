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
    requireApprovalFor: string[];
}
export declare class InteractiveController extends EventEmitter {
    private options;
    private executors;
    private pausedTasks;
    private pendingApprovals;
    private injectionQueue;
    constructor(options: InteractiveControllerOptions);
    /**
     * Register an executor for interactive control
     */
    registerExecutor(taskId: string, executor: PtyExecutor): void;
    /**
     * Inject instruction/guidance into running task
     */
    injectGuidance(taskId: string, guidance: string): void;
    /**
     * Pause task execution
     */
    pauseTask(taskId: string, reason?: string): void;
    /**
     * Resume task execution
     */
    resumeTask(taskId: string): void;
    /**
     * Abort task with explanation
     */
    abortTask(taskId: string, reason: string): void;
    /**
     * Redirect task to new approach
     */
    redirectTask(taskId: string, newDirection: string): void;
    /**
     * Request approval for sensitive operations
     */
    private requestApproval;
    /**
     * Approve or deny pending operation
     */
    handleApproval(approvalId: string, approved: boolean, modifications?: any): void;
    /**
     * Check if operation requires approval
     */
    private requiresApproval;
    /**
     * Get current status of all tasks
     */
    getStatus(): TaskStatus[];
    /**
     * Provide contextual help based on current task state
     */
    provideContextualHelp(taskId: string, context: string): void;
    /**
     * Generate suggestions based on context
     */
    private generateContextualSuggestions;
}
interface TaskStatus {
    taskId: string;
    paused: boolean;
    pendingApprovals: number;
    queuedInjections: number;
    isActive: boolean;
}
export declare function enhanceWithInteractiveControl(claudeSubprocess: ClaudeCodeSubprocessV3, controller: InteractiveController): void;
export {};
//# sourceMappingURL=interactive-controller.d.ts.map