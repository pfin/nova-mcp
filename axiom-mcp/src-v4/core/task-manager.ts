/**
 * Task Manager for concurrent execution tracking
 */

import { PtyExecutor } from '../executors/pty-executor.js';
import { EventEmitter } from 'events';
import { Logger } from './logger.js';

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

export class TaskManager extends EventEmitter {
  private tasks: Map<string, TaskInfo> = new Map();
  private logger = Logger.getInstance();
  
  /**
   * Create a new task
   */
  createTask(prompt: string, parentTaskId?: string): string {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const task: TaskInfo = {
      taskId,
      prompt,
      status: 'pending',
      output: '',
      startTime: Date.now(),
      parentTaskId
    };
    
    this.tasks.set(taskId, task);
    
    // Link to parent if exists
    if (parentTaskId) {
      const parent = this.tasks.get(parentTaskId);
      if (parent) {
        parent.childTaskIds = parent.childTaskIds || [];
        parent.childTaskIds.push(taskId);
      }
    }
    
    this.logger.info('TaskManager', 'createTask', 'Task created', { taskId, prompt: prompt.slice(0, 50) });
    this.emit('taskCreated', task);
    
    return taskId;
  }
  
  /**
   * Start executing a task
   */
  startTask(taskId: string, executor: PtyExecutor): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    task.status = 'running';
    task.executor = executor;
    
    this.logger.info('TaskManager', 'startTask', 'Task started', { taskId });
    this.emit('taskStarted', task);
  }
  
  /**
   * Update task output
   */
  appendOutput(taskId: string, data: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    task.output += data;
    this.emit('taskOutput', { taskId, data });
  }
  
  /**
   * Complete a task
   */
  completeTask(taskId: string, output?: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    task.status = 'completed';
    task.endTime = Date.now();
    if (output !== undefined) {
      task.output = output;
    }
    
    this.logger.info('TaskManager', 'completeTask', 'Task completed', { 
      taskId, 
      duration: task.endTime - task.startTime 
    });
    this.emit('taskCompleted', task);
  }
  
  /**
   * Fail a task
   */
  failTask(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    task.status = 'failed';
    task.endTime = Date.now();
    task.metadata = { ...task.metadata, error };
    
    this.logger.error('TaskManager', 'failTask', 'Task failed', { taskId, error });
    this.emit('taskFailed', task);
  }
  
  /**
   * Interrupt a task
   */
  interruptTask(taskId: string, reason?: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'running') {
      return false;
    }
    
    task.status = 'interrupted';
    task.endTime = Date.now();
    task.metadata = { ...task.metadata, interruptReason: reason };
    
    // Send interrupt to executor
    if (task.executor) {
      task.executor.interrupt();
    }
    
    this.logger.warn('TaskManager', 'interruptTask', 'Task interrupted', { taskId, reason });
    this.emit('taskInterrupted', task);
    
    return true;
  }
  
  /**
   * Get a task by ID
   */
  getTask(taskId: string): TaskInfo | undefined {
    return this.tasks.get(taskId);
  }
  
  /**
   * Get all tasks
   */
  getAllTasks(): TaskInfo[] {
    return Array.from(this.tasks.values());
  }
  
  /**
   * Get running tasks
   */
  getRunningTasks(): TaskInfo[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'running');
  }
  
  /**
   * Check if we should interrupt existing tasks for a new one
   */
  shouldInterruptFor(newPrompt: string): TaskInfo[] {
    const runningTasks = this.getRunningTasks();
    const interruptCandidates: TaskInfo[] = [];
    
    // Heuristics for when to interrupt:
    // 1. If new prompt mentions "stop" or "interrupt"
    if (newPrompt.toLowerCase().includes('stop') || 
        newPrompt.toLowerCase().includes('interrupt')) {
      return runningTasks; // Interrupt all
    }
    
    // 2. If new prompt seems to be a correction/redirect
    const correctionKeywords = ['no', 'wait', 'actually', 'instead', 'don\'t'];
    const hasCorrection = correctionKeywords.some(kw => 
      newPrompt.toLowerCase().startsWith(kw)
    );
    
    if (hasCorrection && runningTasks.length > 0) {
      // Interrupt the most recent task
      return [runningTasks[runningTasks.length - 1]];
    }
    
    // 3. If running task is in "planning" mode for too long
    const now = Date.now();
    for (const task of runningTasks) {
      const runtime = now - task.startTime;
      const hasPlanning = task.output.toLowerCase().includes('analyze') ||
                         task.output.toLowerCase().includes('approach') ||
                         task.output.toLowerCase().includes('consider');
      
      if (runtime > 10000 && hasPlanning && !task.output.includes('File created')) {
        interruptCandidates.push(task);
      }
    }
    
    return interruptCandidates;
  }
  
  /**
   * Clean up completed tasks older than specified age
   */
  cleanup(maxAge: number = 3600000): void { // Default 1 hour
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [taskId, task] of this.tasks) {
      if (task.endTime && (now - task.endTime) > maxAge) {
        toDelete.push(taskId);
      }
    }
    
    for (const taskId of toDelete) {
      this.tasks.delete(taskId);
    }
    
    if (toDelete.length > 0) {
      this.logger.debug('TaskManager', 'cleanup', `Removed ${toDelete.length} old tasks`);
    }
  }
  
  /**
   * Get task hierarchy (for parallel execution)
   */
  getTaskHierarchy(parentTaskId: string): TaskInfo[] {
    const parent = this.tasks.get(parentTaskId);
    if (!parent || !parent.childTaskIds) {
      return [];
    }
    
    return parent.childTaskIds
      .map(id => this.tasks.get(id))
      .filter(task => task !== undefined) as TaskInfo[];
  }
  
  /**
   * Format task for display
   */
  formatTask(taskId: string): string {
    const task = this.tasks.get(taskId);
    if (!task) return `Task ${taskId} not found`;
    
    const runtime = task.endTime 
      ? `${task.endTime - task.startTime}ms`
      : `${Date.now() - task.startTime}ms (running)`;
    
    return `[${taskId}] ${task.status.toUpperCase()} - ${task.prompt.slice(0, 50)}... (${runtime})`;
  }
}

// Singleton instance
export const taskManager = new TaskManager();