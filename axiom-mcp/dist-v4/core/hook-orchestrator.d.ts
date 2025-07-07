/**
 * Axiom v4 - Hook-First Architecture
 * HookOrchestrator is the central hub for ALL execution
 */
import { EventEmitter } from 'events';
import { ConversationDB } from '../hooks/conversation-db.js';
import { EventBus } from '../hooks/event-bus.js';
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
    private executors;
    private monitors;
    constructor(db: ConversationDB, eventBus: EventBus);
    /**
     * Register a hook
     */
    registerHook(hook: Hook): void;
    /**
     * Main entry point - ALL requests go through here
     */
    handleRequest(tool: string, args: any): Promise<any>;
    /**
     * Trigger hooks for an event
     */
    private triggerHooks;
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
}
//# sourceMappingURL=hook-orchestrator.d.ts.map