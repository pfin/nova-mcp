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
export declare class StatusManager extends EventEmitter {
    private tasks;
    private hookOrchestrator?;
    setHookOrchestrator(orchestrator: HookOrchestrator): void;
    createTask(id: string, metadata?: Record<string, any>): TaskStatus;
    updateTaskStatus(id: string, status: TaskStatus['status'], data?: {
        output?: string;
        error?: string;
        metadata?: Record<string, any>;
    }): void;
    getTask(id: string): TaskStatus | undefined;
    getActiveTasks(): TaskStatus[];
    getAllTasks(): TaskStatus[];
    getStats(): {
        total: number;
        active: number;
        completed: number;
        failed: number;
        avgDuration: number;
    };
    clearCompleted(): void;
    getTaskTree(rootId: string): TaskStatus[];
}
//# sourceMappingURL=status-manager.d.ts.map