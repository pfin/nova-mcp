import { EventEmitter } from 'events';
import { HookOrchestrator } from '../core/hook-orchestrator.js';

export interface TaskStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  output?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export class StatusManager extends EventEmitter {
  private tasks: Map<string, TaskStatus> = new Map();
  private hookOrchestrator?: HookOrchestrator;
  
  setHookOrchestrator(orchestrator: HookOrchestrator): void {
    this.hookOrchestrator = orchestrator;
  }
  
  createTask(id: string, metadata?: Record<string, any>): TaskStatus {
    const task: TaskStatus = {
      id,
      status: 'pending',
      startTime: Date.now(),
      metadata
    };
    
    this.tasks.set(id, task);
    this.emit('task:created', task);
    
    // v4: Notify hooks
    if (this.hookOrchestrator) {
      this.hookOrchestrator.triggerHooks('STATUS_TASK_CREATED', { metadata: { task } });
    }
    
    return task;
  }
  
  updateTaskStatus(id: string, status: TaskStatus['status'], data?: {
    output?: string;
    error?: string;
    metadata?: Record<string, any>;
  }): void {
    const task = this.tasks.get(id);
    if (!task) return;
    
    task.status = status;
    
    if (data?.output) task.output = data.output;
    if (data?.error) task.error = data.error;
    if (data?.metadata) task.metadata = { ...task.metadata, ...data.metadata };
    
    if (status === 'completed' || status === 'failed') {
      task.endTime = Date.now();
    }
    
    this.emit(`task:${status}`, task);
    
    // v4: Notify hooks
    if (this.hookOrchestrator) {
      this.hookOrchestrator.triggerHooks('STATUS_TASK_UPDATED', { metadata: { task } });
    }
  }
  
  getTask(id: string): TaskStatus | undefined {
    return this.tasks.get(id);
  }
  
  getActiveTasks(): TaskStatus[] {
    return Array.from(this.tasks.values())
      .filter(task => task.status === 'running' || task.status === 'pending');
  }
  
  getAllTasks(): TaskStatus[] {
    return Array.from(this.tasks.values());
  }
  
  getStats(): {
    total: number;
    active: number;
    completed: number;
    failed: number;
    avgDuration: number;
  } {
    const tasks = Array.from(this.tasks.values());
    const completed = tasks.filter(t => t.status === 'completed');
    const failed = tasks.filter(t => t.status === 'failed');
    const active = tasks.filter(t => t.status === 'running' || t.status === 'pending');
    
    const durations = completed
      .filter(t => t.endTime)
      .map(t => t.endTime! - t.startTime);
    
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
    
    return {
      total: tasks.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      avgDuration
    };
  }
  
  clearCompleted(): void {
    const completed = Array.from(this.tasks.entries())
      .filter(([_, task]) => task.status === 'completed' || task.status === 'failed');
    
    for (const [id] of completed) {
      this.tasks.delete(id);
    }
    
    this.emit('tasks:cleared', completed.length);
  }
  
  getTaskTree(rootId: string): TaskStatus[] {
    const tree: TaskStatus[] = [];
    const task = this.tasks.get(rootId);
    
    if (task) {
      tree.push(task);
      
      // Find children (tasks with parent metadata)
      for (const [id, t] of this.tasks) {
        if (t.metadata?.parentId === rootId) {
          tree.push(...this.getTaskTree(id));
        }
      }
    }
    
    return tree;
  }
}