/**
 * Master Controller - Central orchestrator for all tasks and workers
 *
 * Based on expert recommendation from GoodIdeasFromOtherModels.txt:
 * "The main process will act as a Master Controller, managing a pool of worker threads.
 * Each worker is responsible for managing the lifecycle of a single Claude subprocess inside a PTY."
 */
import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { PriorityQueue } from './priority-queue.js';
import { EventBus, EventType } from './event-bus.js';
import { MonitoringWebSocketServer, InterventionAPI } from '../server/websocket-server.js';
export class MasterController extends EventEmitter {
    options;
    taskQueue;
    workers = new Map();
    availableWorkers = new Set();
    busyWorkers = new Map(); // workerId -> taskId
    tasks = new Map();
    portGraph = new Map();
    eventBus;
    nextPort = 9000;
    webSocketServer;
    interventionAPI;
    constructor(options = {}) {
        super();
        this.options = options;
        this.taskQueue = new PriorityQueue();
        this.eventBus = options.eventBus || new EventBus({ logDir: './logs-v3' });
        // Initialize WebSocket server if enabled
        if (options.enableWebSocket !== false) {
            this.initializeWebSocket();
        }
        // Initialize worker pool
        this.initializeWorkerPool();
    }
    /**
     * Initialize WebSocket server for real-time monitoring
     * From docs: "A WebSocket server is the ideal choice"
     */
    initializeWebSocket() {
        const port = this.options.webSocketPort || 8080;
        this.webSocketServer = new MonitoringWebSocketServer(this.eventBus, port);
        this.interventionAPI = new InterventionAPI(this.webSocketServer, this);
        console.error(`[MasterController] WebSocket server initialized on port ${port}`);
    }
    /**
     * Initialize the worker pool
     * From docs: "managing a pool of worker threads"
     */
    async initializeWorkerPool() {
        const maxWorkers = this.options.maxWorkers || 4;
        for (let i = 0; i < maxWorkers; i++) {
            await this.spawnWorker();
        }
        console.error(`[MasterController] Initialized ${maxWorkers} workers`);
    }
    /**
     * Spawn a new worker thread
     * From docs: "Each worker is responsible for managing the lifecycle of a single Claude subprocess"
     */
    async spawnWorker() {
        const workerId = uuidv4();
        const workerScript = this.options.workerScript ||
            path.join(path.dirname(new URL(import.meta.url).pathname), '../workers/claude-worker.js');
        const worker = new Worker(workerScript, {
            workerData: {
                workerId,
                eventBusLogDir: './logs-v3'
            }
        });
        // Set up message handling
        worker.on('message', (message) => {
            this.handleWorkerMessage(workerId, message);
        });
        worker.on('error', (error) => {
            console.error(`[MasterController] Worker ${workerId} error:`, error);
            this.handleWorkerError(workerId, error);
        });
        worker.on('exit', (code) => {
            console.error(`[MasterController] Worker ${workerId} exited with code ${code}`);
            this.handleWorkerExit(workerId, code);
        });
        this.workers.set(workerId, worker);
        // Wait for worker to be ready
        await new Promise((resolve) => {
            const handler = (message) => {
                if (message.type === 'ready') {
                    this.availableWorkers.add(workerId);
                    worker.off('message', handler);
                    resolve();
                }
            };
            worker.on('message', handler);
        });
        this.eventBus.logEvent({
            taskId: 'system',
            workerId: 'master',
            event: EventType.WORKER_SPAWNED,
            payload: { workerId }
        });
        return workerId;
    }
    /**
     * Submit a task to the queue
     * From docs: "When a new task comes in, it assigns it to an available worker"
     */
    async submitTask(prompt, options = {}) {
        const task = {
            id: uuidv4(),
            parentId: options.parentId || null,
            prompt,
            priority: options.priority || 0,
            status: 'queued',
            acceptanceCriteria: options.acceptanceCriteria || {},
            createdAt: Date.now(),
            ...options
        };
        this.tasks.set(task.id, task);
        this.taskQueue.enqueue(task);
        this.eventBus.logEvent({
            taskId: task.id,
            workerId: 'master',
            event: EventType.TASK_START,
            payload: {
                prompt: task.prompt.substring(0, 100) + '...',
                priority: task.priority,
                parentId: task.parentId
            }
        });
        // Try to assign immediately
        await this.assignNextTask();
        return task.id;
    }
    /**
     * Assign next task to available worker
     * Core of the Master Controller pattern
     */
    async assignNextTask() {
        if (this.taskQueue.isEmpty() || this.availableWorkers.size === 0) {
            return;
        }
        const task = this.taskQueue.dequeue();
        const workerId = this.availableWorkers.values().next().value;
        // Mark worker as busy
        this.availableWorkers.delete(workerId);
        this.busyWorkers.set(workerId, task.id);
        // Update task status
        task.status = 'assigned';
        task.assignedAt = Date.now();
        task.workerId = workerId;
        // Send task to worker
        const worker = this.workers.get(workerId);
        worker.postMessage({
            type: 'execute',
            task
        });
        this.emit('task:assigned', { taskId: task.id, workerId });
        this.eventBus.logEvent({
            taskId: task.id,
            workerId,
            event: EventType.TASK_ASSIGNED,
            payload: { workerId }
        });
    }
    /**
     * Handle messages from workers
     * From docs: "The worker sends a message to the Master Controller"
     */
    handleWorkerMessage(workerId, message) {
        const taskId = this.busyWorkers.get(workerId);
        switch (message.type) {
            case 'stream':
                // From docs: "Stream all data from the PTY to the main thread"
                if (taskId) {
                    this.emit('task:stream', {
                        taskId,
                        workerId,
                        data: message.payload
                    });
                    // Parse for TOOL_INVOCATION as specified in docs
                    this.parseToolInvocations(taskId, message.payload);
                }
                break;
            case 'tool_call':
                // From docs: "parse LLM output for claims"
                if (taskId) {
                    this.emit('task:tool_call', {
                        taskId,
                        workerId,
                        tool: message.payload
                    });
                    this.eventBus.logEvent({
                        taskId,
                        workerId,
                        event: EventType.TOOL_CALL,
                        payload: message.payload
                    });
                }
                break;
            case 'spawn_child':
                // From docs: "When a running Claude instance needs to spawn a child task"
                if (taskId) {
                    const parentTask = this.tasks.get(taskId);
                    const childPrompt = message.payload.prompt;
                    // Create child task with higher priority
                    this.submitTask(childPrompt, {
                        parentId: taskId,
                        priority: parentTask.priority + 1,
                        acceptanceCriteria: message.payload.acceptanceCriteria
                    });
                }
                break;
            case 'complete':
                // Task completed - run verification
                if (taskId) {
                    this.handleTaskComplete(taskId, workerId, message.payload);
                }
                break;
            case 'error':
                // Task failed
                if (taskId) {
                    this.handleTaskError(taskId, workerId, message.payload);
                }
                break;
            case 'verification':
                // Verification results
                if (taskId) {
                    this.handleVerificationResult(taskId, message.payload);
                }
                break;
        }
    }
    /**
     * Parse output for TOOL_INVOCATION patterns
     * From docs: "watch the PTY output stream for the TOOL_INVOCATION: prefix"
     */
    parseToolInvocations(taskId, output) {
        const pattern = /TOOL_INVOCATION:\s*({[^}]+})/g;
        let match;
        while ((match = pattern.exec(output)) !== null) {
            try {
                const toolCall = JSON.parse(match[1]);
                toolCall.timestamp = Date.now();
                toolCall.rawText = match[0];
                this.emit('task:tool_invocation', {
                    taskId,
                    tool: toolCall
                });
                this.eventBus.logEvent({
                    taskId,
                    workerId: 'master',
                    event: EventType.TOOL_CALL,
                    payload: toolCall
                });
            }
            catch (error) {
                console.error('[MasterController] Failed to parse tool invocation:', error);
            }
        }
    }
    /**
     * Handle task completion
     */
    handleTaskComplete(taskId, workerId, result) {
        const task = this.tasks.get(taskId);
        task.status = 'verifying';
        task.completedAt = Date.now();
        task.result = result;
        this.emit('task:complete', { taskId, workerId, result });
        // Worker becomes available again
        this.busyWorkers.delete(workerId);
        this.availableWorkers.add(workerId);
        // Assign next task
        this.assignNextTask();
    }
    /**
     * Handle task error
     */
    handleTaskError(taskId, workerId, error) {
        const task = this.tasks.get(taskId);
        task.status = 'failed';
        task.completedAt = Date.now();
        this.emit('task:error', { taskId, workerId, error });
        this.eventBus.logEvent({
            taskId,
            workerId,
            event: EventType.TASK_FAILED,
            payload: error
        });
        // Worker becomes available again
        this.busyWorkers.delete(workerId);
        this.availableWorkers.add(workerId);
        // Assign next task
        this.assignNextTask();
    }
    /**
     * Handle verification results
     * From docs: "A task is only marked 'Succeeded' if it passes all verification checks"
     */
    handleVerificationResult(taskId, verification) {
        const task = this.tasks.get(taskId);
        if (verification.passed) {
            task.status = 'complete';
            this.emit('task:verified', { taskId, verification });
            this.eventBus.logEvent({
                taskId,
                workerId: task.workerId,
                event: EventType.VERIFICATION_PASS,
                payload: verification
            });
        }
        else {
            task.status = 'failed';
            this.emit('task:verification_failed', { taskId, verification });
            this.eventBus.logEvent({
                taskId,
                workerId: task.workerId,
                event: EventType.VERIFICATION_FAIL,
                payload: verification
            });
        }
    }
    /**
     * Handle worker errors
     */
    handleWorkerError(workerId, error) {
        const taskId = this.busyWorkers.get(workerId);
        if (taskId) {
            this.handleTaskError(taskId, workerId, error);
        }
        // Remove failed worker
        this.workers.delete(workerId);
        this.availableWorkers.delete(workerId);
        this.busyWorkers.delete(workerId);
        // Spawn replacement worker
        this.spawnWorker();
    }
    /**
     * Handle worker exit
     */
    handleWorkerExit(workerId, code) {
        console.error(`[MasterController] Worker ${workerId} exited with code ${code}`);
        // Clean up
        this.workers.delete(workerId);
        this.availableWorkers.delete(workerId);
        const taskId = this.busyWorkers.get(workerId);
        if (taskId) {
            // Requeue the task
            const task = this.tasks.get(taskId);
            task.status = 'queued';
            task.workerId = undefined;
            this.taskQueue.enqueue(task);
            this.busyWorkers.delete(workerId);
        }
        // Spawn replacement worker
        this.spawnWorker();
    }
    /**
     * Send intervention command to a task
     * From docs: "Write to PTY: The worker receives the message and writes directly into the Claude subprocess"
     */
    async intervene(taskId, prompt) {
        const task = this.tasks.get(taskId);
        if (!task || !task.workerId) {
            throw new Error(`Task ${taskId} not found or not assigned`);
        }
        const worker = this.workers.get(task.workerId);
        if (!worker) {
            throw new Error(`Worker ${task.workerId} not found`);
        }
        worker.postMessage({
            type: 'intervene',
            payload: prompt
        });
        this.emit('task:intervention', { taskId, prompt });
        this.eventBus.logEvent({
            taskId,
            workerId: task.workerId,
            event: EventType.INTERVENTION,
            payload: { prompt }
        });
    }
    /**
     * Get current status of all tasks and workers
     */
    getStatus() {
        return {
            queue: {
                size: this.taskQueue.size(),
                tasks: this.taskQueue.toArray()
            },
            workers: {
                total: this.workers.size,
                available: this.availableWorkers.size,
                busy: this.busyWorkers.size
            },
            tasks: {
                total: this.tasks.size,
                byStatus: this.getTasksByStatus()
            },
            ports: Array.from(this.portGraph.values())
        };
    }
    /**
     * Get tasks grouped by status
     */
    getTasksByStatus() {
        const byStatus = {};
        for (const task of this.tasks.values()) {
            byStatus[task.status] = (byStatus[task.status] || 0) + 1;
        }
        return byStatus;
    }
    /**
     * Allocate a port for inter-agent communication
     * From docs: "The parent keeps a port graph"
     */
    allocatePort(agentId, parentId) {
        const port = this.nextPort++;
        const portInfo = {
            port,
            agentId,
            parentId,
            status: 'active',
            createdAt: Date.now()
        };
        this.portGraph.set(agentId, portInfo);
        return port;
    }
    /**
     * Shutdown all workers gracefully
     */
    async shutdown() {
        console.error('[MasterController] Shutting down...');
        // Stop accepting new tasks
        this.taskQueue = new PriorityQueue();
        // Shutdown WebSocket server
        if (this.webSocketServer) {
            await this.webSocketServer.shutdown();
        }
        // Terminate all workers
        for (const [workerId, worker] of this.workers) {
            await worker.terminate();
        }
        this.workers.clear();
        this.availableWorkers.clear();
        this.busyWorkers.clear();
        // Close event bus
        await this.eventBus.close();
        console.error('[MasterController] Shutdown complete');
    }
}
//# sourceMappingURL=master-controller.js.map