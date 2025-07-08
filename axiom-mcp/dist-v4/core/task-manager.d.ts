/**
 * Task Manager for concurrent execution tracking
 */
import { PtyExecutor } from '../executors/pty-executor.js';
import { EventEmitter } from 'events';
export interface TaskInfo {
    taskId: string;
    prompt: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';
    executor?: PtyExecutor;
    output: string;
    startTime: number;
    endTime?: number;
    parentTaskId?: string;
    childTaskIds?: string[];
    metadata?: any;
}
export declare class TaskManager extends EventEmitter {
    private tasks;
    private logger;
    /**
     * Create a new task
     */
    createTask(prompt: string, parentTaskId?: string): string;
    /**
     * Start executing a task
     */
    startTask(taskId: string, executor: PtyExecutor): void;
    /**
     * Update task output
     */
    appendOutput(taskId: string, data: string): void;
    /**
     * Complete a task
     */
    completeTask(taskId: string, output?: string): void;
    /**
     * Fail a task
     */
    failTask(taskId: string, error: string): void;
    /**
     * Interrupt a task
     */
    interruptTask(taskId: string, reason?: string): boolean;
    /**
     * Get a task by ID
     */
    getTask(taskId: string): TaskInfo | undefined;
    /**
     * Get all tasks
     */
    getAllTasks(): TaskInfo[];
    /**
     * Get running tasks
     */
    getRunningTasks(): TaskInfo[];
    /**
     * Check if we should interrupt existing tasks for a new one
     */
    shouldInterruptFor(newPrompt: string): TaskInfo[];
    /**
     * Clean up completed tasks older than specified age
     */
    cleanup(maxAge?: number): void;
    /**
     * Get task hierarchy (for parallel execution)
     */
    getTaskHierarchy(parentTaskId: string): TaskInfo[];
    /**
     * Format task for display
     */
    formatTask(taskId: string): string;
}
export declare const taskManager: TaskManager;
//# sourceMappingURL=task-manager.d.ts.map