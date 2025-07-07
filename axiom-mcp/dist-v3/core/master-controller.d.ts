/**
 * Master Controller - Central orchestrator for all tasks and workers
 *
 * Based on expert recommendation from GoodIdeasFromOtherModels.txt:
 * "The main process will act as a Master Controller, managing a pool of worker threads.
 * Each worker is responsible for managing the lifecycle of a single Claude subprocess inside a PTY."
 */
import { EventEmitter } from 'events';
import { Task } from './types.js';
import { EventBus } from './event-bus.js';
export interface MasterControllerOptions {
    maxWorkers?: number;
    workerScript?: string;
    eventBus?: EventBus;
    enableWebSocket?: boolean;
    webSocketPort?: number;
}
export declare class MasterController extends EventEmitter {
    private options;
    private taskQueue;
    private workers;
    private availableWorkers;
    private busyWorkers;
    private tasks;
    private portGraph;
    private eventBus;
    private nextPort;
    private webSocketServer?;
    private interventionAPI?;
    constructor(options?: MasterControllerOptions);
    /**
     * Initialize WebSocket server for real-time monitoring
     * From docs: "A WebSocket server is the ideal choice"
     */
    private initializeWebSocket;
    /**
     * Initialize the worker pool
     * From docs: "managing a pool of worker threads"
     */
    private initializeWorkerPool;
    /**
     * Spawn a new worker thread
     * From docs: "Each worker is responsible for managing the lifecycle of a single Claude subprocess"
     */
    private spawnWorker;
    /**
     * Submit a task to the queue
     * From docs: "When a new task comes in, it assigns it to an available worker"
     */
    submitTask(prompt: string, options?: Partial<Task>): Promise<string>;
    /**
     * Assign next task to available worker
     * Core of the Master Controller pattern
     */
    private assignNextTask;
    /**
     * Handle messages from workers
     * From docs: "The worker sends a message to the Master Controller"
     */
    private handleWorkerMessage;
    /**
     * Parse output for TOOL_INVOCATION patterns
     * From docs: "watch the PTY output stream for the TOOL_INVOCATION: prefix"
     */
    private parseToolInvocations;
    /**
     * Handle task completion
     */
    private handleTaskComplete;
    /**
     * Handle task error
     */
    private handleTaskError;
    /**
     * Handle verification results
     * From docs: "A task is only marked 'Succeeded' if it passes all verification checks"
     */
    private handleVerificationResult;
    /**
     * Handle worker errors
     */
    private handleWorkerError;
    /**
     * Handle worker exit
     */
    private handleWorkerExit;
    /**
     * Send intervention command to a task
     * From docs: "Write to PTY: The worker receives the message and writes directly into the Claude subprocess"
     */
    intervene(taskId: string, prompt: string): Promise<void>;
    /**
     * Get current status of all tasks and workers
     */
    getStatus(): any;
    /**
     * Get tasks grouped by status
     */
    private getTasksByStatus;
    /**
     * Allocate a port for inter-agent communication
     * From docs: "The parent keeps a port graph"
     */
    allocatePort(agentId: string, parentId?: string): number;
    /**
     * Shutdown all workers gracefully
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=master-controller.d.ts.map