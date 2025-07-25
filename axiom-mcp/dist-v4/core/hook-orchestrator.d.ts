/**
 * Axiom v4 - Hook-First Architecture
 * HookOrchestrator is the central hub for ALL execution
 */
import { EventEmitter } from 'events';
export declare enum HookEvent {
    REQUEST_RECEIVED = "request_received",
    REQUEST_VALIDATED = "request_validated",
    REQUEST_BLOCKED = "request_blocked",
    EXECUTION_STARTED = "execution_started",
    EXECUTION_STREAM = "execution_stream",
    EXECUTION_INTERVENTION = "execution_intervention",
    EXECUTION_COMPLETED = "execution_completed",
    EXECUTION_FAILED = "execution_failed",
    MONITOR_ATTACH = "monitor_attach",
    MONITOR_DETACH = "monitor_detach",
    PARALLEL_SPAWN = "parallel_spawn",
    PARALLEL_MERGE = "parallel_merge"
}
export interface HookContext {
    event: HookEvent;
    request?: {
        tool: string;
        args: any;
    };
    execution?: {
        taskId: string;
        status: string;
        output?: string;
    };
    stream?: {
        data: string;
        source: string;
    };
    metadata?: Record<string, any>;
    db?: any;
    eventBus?: any;
    statusManager?: any;
}
export interface HookResult {
    action: 'continue' | 'block' | 'modify' | 'redirect';
    reason?: string;
    modifications?: any;
    redirect?: {
        tool: string;
        args: any;
    };
}
export type HookHandler = (context: HookContext) => Promise<HookResult>;
export interface Hook {
    name: string;
    events: HookEvent[];
    priority: number;
    handler: HookHandler;
}
export declare class HookOrchestrator extends EventEmitter {
    private hooks;
    private db;
    private eventBus;
    private statusManager;
    private executors;
    private monitors;
    private activeTasks;
    private logger;
    constructor(db: any, eventBus: any, statusManager?: any);
    /**
     * Register a hook
     */
    registerHook(hook: Hook): void;
    /**
     * Main entry point - ALL requests go through here
     */
    handleRequest(tool: string, args: any): Promise<any>;
    private _handleRequestInternal;
    /**
     * Trigger hooks for an event
     */
    triggerHooks(event: HookEvent | string, context: Partial<HookContext>): Promise<HookResult>;
    /**
     * Select executor based on tool and args
     */
    private selectExecutor;
    /**
     * Register an executor
     */
    registerExecutor(tool: string, executor: any): void;
    /**
     * Attach a monitor (VerboseMonitor, WebSocket, etc)
     */
    attachMonitor(monitor: any): void;
    /**
     * Notify all monitors
     */
    private notifyMonitors;
    /**
     * Enable parallel execution through hooks
     */
    spawnParallel(requests: Array<{
        tool: string;
        args: any;
    }>): Promise<any[]>;
    /**
     * Get status of active tasks
     */
    getTaskStatus(taskId?: string): any;
    /**
     * Clear completed/failed tasks
     */
    clearCompletedTasks(): void;
    /**
     * Get an active task by ID (alias for getTaskStatus)
     */
    getActiveTask(taskId: string): any;
    /**
     * Get all active tasks
     */
    getAllActiveTasks(): any[];
}
//# sourceMappingURL=hook-orchestrator.d.ts.map