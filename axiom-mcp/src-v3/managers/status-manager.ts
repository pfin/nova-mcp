/**
 * Status Manager for Axiom MCP v3
 * Tracks task execution status and metadata
 */

export interface TaskStatus {
  id: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  temporalStartTime?: string;
  temporalEndTime?: string;
  depth: number;
  parentTask?: string;
  childTasks: string[];
  output?: string;
  error?: string;
  taskType: string;
  taskTypeId?: string;
  systemPrompt?: string;
  metadata?: {
    filesCreated?: string[];
    fileCount?: number;
    testsRun?: number;
    testsPassed?: number;
    [key: string]: any;
  };
}

export class StatusManager {
  private tasks: Map<string, TaskStatus> = new Map();
  private taskOrder: string[] = [];
  
  addTask(task: TaskStatus): void {
    this.tasks.set(task.id, task);
    this.taskOrder.push(task.id);
    console.error(`[STATUS] Task added: ${task.id} - ${task.prompt.substring(0, 50)}...`);
  }
  
  updateTask(taskId: string, updates: Partial<TaskStatus>): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`[STATUS] Warning: Task ${taskId} not found for update`);
      return;
    }
    
    // Merge updates
    Object.assign(task, updates);
    
    // Set end time if status is terminal
    if (updates.status === 'completed' || updates.status === 'failed') {
      task.endTime = new Date();
    }
    
    console.error(`[STATUS] Task updated: ${taskId} - status: ${task.status}`);
  }
  
  getTask(taskId: string): TaskStatus | undefined {
    return this.tasks.get(taskId);
  }
  
  getActiveTasks(): TaskStatus[] {
    return Array.from(this.tasks.values())
      .filter(task => task.status === 'running' || task.status === 'pending');
  }
  
  getRecentTasks(limit: number = 10): TaskStatus[] {
    return this.taskOrder
      .slice(-limit)
      .reverse()
      .map(id => this.tasks.get(id))
      .filter(task => task !== undefined) as TaskStatus[];
  }
  
  getStats(): {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
  } {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      running: tasks.filter(t => t.status === 'running').length,
      pending: tasks.filter(t => t.status === 'pending').length,
    };
  }
  
  clear(): void {
    this.tasks.clear();
    this.taskOrder = [];
  }
}