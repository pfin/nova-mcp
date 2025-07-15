/**
 * Axiom v5 - Parallel Executor
 * Manages multiple Claude instances running in parallel
 * Aggressively kills non-productive instances
 */
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs/promises';
// Simple logger for v5
const logDebug = (context, message, data) => {
    console.log(`[${context}] ${message}`, data || '');
};
const logger = {
    info: (c, m, msg, data) => console.log(`[INFO] ${c}.${m}: ${msg}`, data || ''),
    debug: (c, m, msg, data) => console.log(`[DEBUG] ${c}.${m}: ${msg}`, data || ''),
    warn: (c, m, msg, data) => console.warn(`[WARN] ${c}.${m}: ${msg}`, data || ''),
    error: (c, m, msg, data) => console.error(`[ERROR] ${c}.${m}: ${msg}`, data || ''),
    trace: (c, m, msg, data) => { } // Silent in production
};
// Stub PtyExecutor implementation for v5
class StubPtyExecutor {
    async execute(prompt, systemPrompt, taskId, streamHandler) {
        // Simulate execution
        const output = `[STUB] Executing task ${taskId}: ${prompt.slice(0, 50)}...`;
        if (streamHandler) {
            streamHandler(output + '\n');
        }
        return output;
    }
    write(data) {
        console.log('[STUB] Write:', data);
    }
    interrupt() {
        console.log('[STUB] Interrupt');
    }
    kill() {
        console.log('[STUB] Kill');
    }
}
export class ParallelExecutor extends EventEmitter {
    instances = new Map();
    taskQueue = [];
    completedTasks = [];
    failedTasks = [];
    options;
    monitorInterval;
    workspaceWatcher;
    // Public properties for V5 compatibility
    killedInstances = new Set();
    maxParallel = 5;
    constructor(options = {}) {
        super();
        this.options = {
            maxInstances: options.maxInstances || 10,
            workspaceRoot: options.workspaceRoot || '/tmp/axiom-parallel',
            killIdleAfterMs: options.killIdleAfterMs || 30000, // 30 seconds
            killUnproductiveAfterMs: options.killUnproductiveAfterMs || 120000, // 2 minutes
            minProductivityScore: options.minProductivityScore || 20,
            enableAggressiveKilling: options.enableAggressiveKilling ?? true
        };
        logger.info('ParallelExecutor', 'constructor', 'Initialized with options', this.options);
    }
    /**
     * Execute tasks in parallel
     */
    async execute(tasks) {
        logger.info('ParallelExecutor', 'execute', 'Starting parallel execution', {
            taskCount: tasks.length,
            maxInstances: this.options.maxInstances
        });
        // Queue all tasks
        this.taskQueue = [...tasks];
        // Create workspace root
        await fs.mkdir(this.options.workspaceRoot, { recursive: true });
        // Start monitoring
        this.startMonitoring();
        // Spawn initial instances
        const instanceCount = Math.min(this.options.maxInstances, tasks.length);
        for (let i = 0; i < instanceCount; i++) {
            await this.spawnInstance();
        }
        // Wait for all tasks to complete
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const pending = this.taskQueue.filter(t => t.status === 'pending').length;
                const running = Array.from(this.instances.values()).filter(i => i.status === 'busy').length;
                logger.debug('ParallelExecutor', 'execute', 'Checking progress', {
                    pending,
                    running,
                    completed: this.completedTasks.length,
                    failed: this.failedTasks.length
                });
                if (pending === 0 && running === 0) {
                    clearInterval(checkInterval);
                    this.stopMonitoring();
                    // Build results map
                    const results = new Map();
                    for (const task of this.completedTasks) {
                        results.set(task.id, task.result || '');
                    }
                    resolve(results);
                }
            }, 1000);
        });
    }
    /**
     * Spawn a new Claude instance
     */
    async spawnInstance() {
        const instanceId = `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const workspaceDir = path.join(this.options.workspaceRoot, instanceId);
        logger.info('ParallelExecutor', 'spawnInstance', 'Spawning new instance', { instanceId });
        // Create workspace directory
        await fs.mkdir(workspaceDir, { recursive: true });
        // Create executor (using stub for now, replace with real PtyExecutor in production)
        const executor = new StubPtyExecutor();
        const instance = {
            id: instanceId,
            executor,
            workspaceDir,
            status: 'idle',
            output: '',
            startTime: Date.now(),
            lastActivity: Date.now(),
            productivityScore: 100,
            filesCreated: new Set(),
            linesOutput: 0,
            idleTime: 0
        };
        this.instances.set(instanceId, instance);
        // Start processing tasks
        this.assignNextTask(instance);
        return instance;
    }
    /**
     * Assign next available task to instance
     */
    async assignNextTask(instance) {
        // Find next pending task
        const task = this.taskQueue.find(t => t.status === 'pending' &&
            (!t.dependencies || t.dependencies.every(d => this.completedTasks.some(ct => ct.id === d))));
        if (!task) {
            logger.debug('ParallelExecutor', 'assignNextTask', 'No tasks available', { instanceId: instance.id });
            instance.status = 'idle';
            return;
        }
        logger.info('ParallelExecutor', 'assignNextTask', 'Assigning task to instance', {
            instanceId: instance.id,
            taskId: task.id
        });
        // Mark task as running
        task.status = 'running';
        task.assignedInstance = instance.id;
        task.startTime = Date.now();
        task.lastActivity = Date.now();
        instance.status = 'busy';
        instance.currentTask = task;
        instance.output = '';
        instance.linesOutput = 0;
        instance.lastActivity = Date.now();
        // Execute with monitoring
        try {
            const result = await instance.executor.execute(task.prompt, 'You are an expert programmer. Write code, not explanations. Implement immediately.', task.id, (data) => this.handleStreamData(instance, data));
            // Task completed
            task.status = 'completed';
            task.result = result;
            task.endTime = Date.now();
            this.completedTasks.push(task);
            logger.info('ParallelExecutor', 'assignNextTask', 'Task completed', {
                instanceId: instance.id,
                taskId: task.id,
                duration: task.endTime - task.startTime,
                filesCreated: task.filesCreated.length
            });
        }
        catch (error) {
            // Task failed
            task.status = 'failed';
            task.error = error instanceof Error ? error.message : String(error);
            task.endTime = Date.now();
            this.failedTasks.push(task);
            logger.error('ParallelExecutor', 'assignNextTask', 'Task failed', {
                instanceId: instance.id,
                taskId: task.id,
                error: task.error
            });
        }
        // Reset instance and assign next task
        instance.currentTask = undefined;
        instance.status = 'idle';
        await this.assignNextTask(instance);
    }
    /**
     * Handle stream data from instance
     */
    handleStreamData(instance, data) {
        instance.output += data;
        instance.linesOutput += (data.match(/\n/g) || []).length;
        instance.lastActivity = Date.now();
        if (instance.currentTask) {
            instance.currentTask.outputLines = instance.linesOutput;
            instance.currentTask.lastActivity = Date.now();
        }
        // Check for file creation
        const fileCreateRegex = /(?:Creating|Writing|Saving) (?:file |to )?['"](.*?)['"]/gi;
        let match;
        while ((match = fileCreateRegex.exec(data)) !== null) {
            const filePath = match[1];
            instance.filesCreated.add(filePath);
            if (instance.currentTask) {
                instance.currentTask.filesCreated.push(filePath);
            }
        }
        // Update productivity score
        this.updateProductivityScore(instance);
        // Emit progress
        this.emit('progress', {
            instanceId: instance.id,
            taskId: instance.currentTask?.id,
            data
        });
    }
    /**
     * Update instance productivity score
     */
    updateProductivityScore(instance) {
        const now = Date.now();
        const timeSinceStart = now - instance.startTime;
        const timeSinceActivity = now - instance.lastActivity;
        // Base score from output rate
        const outputRate = instance.linesOutput / (timeSinceStart / 1000);
        const outputScore = Math.min(50, outputRate * 10);
        // File creation bonus
        const fileScore = Math.min(30, instance.filesCreated.size * 10);
        // Idle penalty
        const idlePenalty = Math.min(50, (timeSinceActivity / 1000) * 2);
        // Calculate final score
        instance.productivityScore = Math.max(0, outputScore + fileScore - idlePenalty);
        logDebug('PARALLEL', `Instance ${instance.id} productivity: ${instance.productivityScore}`, {
            outputRate,
            filesCreated: instance.filesCreated.size,
            idleTime: timeSinceActivity
        });
    }
    /**
     * Start monitoring instances
     */
    startMonitoring() {
        this.monitorInterval = setInterval(() => {
            const now = Date.now();
            for (const [id, instance] of this.instances) {
                const timeSinceActivity = now - instance.lastActivity;
                // Update productivity
                this.updateProductivityScore(instance);
                // Kill idle instances
                if (instance.status === 'idle' && timeSinceActivity > this.options.killIdleAfterMs) {
                    logger.warn('ParallelExecutor', 'monitor', 'Killing idle instance', {
                        instanceId: id,
                        idleTime: timeSinceActivity
                    });
                    this.killInstance(instance, 'Idle timeout');
                    continue;
                }
                // Kill unproductive instances
                if (this.options.enableAggressiveKilling &&
                    instance.status === 'busy' &&
                    instance.productivityScore < this.options.minProductivityScore &&
                    timeSinceActivity > this.options.killUnproductiveAfterMs) {
                    logger.warn('ParallelExecutor', 'monitor', 'Killing unproductive instance', {
                        instanceId: id,
                        productivityScore: instance.productivityScore,
                        timeSinceActivity
                    });
                    this.killInstance(instance, 'Unproductive - no meaningful output');
                    continue;
                }
                // Detect stuck instances (no output for extended period)
                if (instance.status === 'busy' && timeSinceActivity > 60000) {
                    logger.warn('ParallelExecutor', 'monitor', 'Instance appears stuck', {
                        instanceId: id,
                        taskId: instance.currentTask?.id,
                        timeSinceActivity
                    });
                    // Try to unstick with interrupt
                    instance.executor.interrupt();
                    instance.executor.write('\n');
                }
            }
            // Spawn new instances if needed
            const activeCount = Array.from(this.instances.values()).filter(i => i.status === 'busy').length;
            const pendingTasks = this.taskQueue.filter(t => t.status === 'pending').length;
            if (pendingTasks > 0 && activeCount < this.options.maxInstances) {
                this.spawnInstance();
            }
        }, 5000); // Check every 5 seconds
    }
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = undefined;
        }
    }
    /**
     * Kill an instance
     */
    killInstance(instance, reason) {
        logger.info('ParallelExecutor', 'killInstance', 'Killing instance', {
            instanceId: instance.id,
            reason,
            hadTask: !!instance.currentTask
        });
        // Mark task as failed if any
        if (instance.currentTask) {
            instance.currentTask.status = 'killed';
            instance.currentTask.error = `Instance killed: ${reason}`;
            instance.currentTask.endTime = Date.now();
            this.failedTasks.push(instance.currentTask);
            // Re-queue the task
            const newTask = { ...instance.currentTask };
            newTask.status = 'pending';
            newTask.assignedInstance = undefined;
            delete newTask.startTime;
            delete newTask.endTime;
            delete newTask.result;
            delete newTask.error;
            this.taskQueue.push(newTask);
        }
        // Kill executor
        instance.executor.kill();
        instance.status = 'dead';
        // Remove from instances
        this.instances.delete(instance.id);
        // Clean up workspace (async, don't wait)
        fs.rm(instance.workspaceDir, { recursive: true, force: true }).catch(err => {
            logger.error('ParallelExecutor', 'killInstance', 'Failed to clean workspace', {
                instanceId: instance.id,
                error: err
            });
        });
    }
    /**
     * Get current status
     */
    getStatus() {
        const instances = Array.from(this.instances.values()).map(i => ({
            id: i.id,
            status: i.status,
            currentTask: i.currentTask?.id,
            productivityScore: i.productivityScore,
            filesCreated: i.filesCreated.size,
            linesOutput: i.linesOutput,
            uptime: Date.now() - i.startTime
        }));
        return {
            instances,
            taskQueue: this.taskQueue.filter(t => t.status === 'pending').length,
            running: this.taskQueue.filter(t => t.status === 'running').length,
            completed: this.completedTasks.length,
            failed: this.failedTasks.length,
            killed: this.failedTasks.filter(t => t.status === 'killed').length
        };
    }
    /**
     * Send message to specific instance
     */
    sendToInstance(instanceId, message) {
        const instance = this.instances.get(instanceId);
        if (!instance || instance.status !== 'busy') {
            return false;
        }
        instance.executor.write(message);
        instance.lastActivity = Date.now();
        return true;
    }
    /**
     * Interrupt specific instance
     */
    interruptInstance(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance || instance.status !== 'busy') {
            return false;
        }
        instance.executor.interrupt();
        return true;
    }
    /**
     * Shutdown all instances
     */
    async shutdown() {
        logger.info('ParallelExecutor', 'shutdown', 'Shutting down all instances');
        this.stopMonitoring();
        // Kill all instances
        for (const instance of this.instances.values()) {
            this.killInstance(instance, 'Shutdown requested');
        }
        // Clean workspace
        try {
            await fs.rm(this.options.workspaceRoot, { recursive: true, force: true });
        }
        catch (err) {
            logger.error('ParallelExecutor', 'shutdown', 'Failed to clean workspace root', { error: err });
        }
    }
    // Public methods for V5 compatibility
    /**
     * Execute tasks in parallel (V5 interface)
     */
    async executeTasks(tasks, options) {
        // Convert to internal format
        const parallelTasks = tasks.map(t => ({
            id: t.id,
            prompt: t.prompt,
            priority: 1,
            status: 'pending',
            outputLines: 0,
            lastActivity: Date.now(),
            filesCreated: []
        }));
        // Update options if provided
        if (options?.workspaceBase) {
            this.options.workspaceRoot = options.workspaceBase;
        }
        if (options?.productivityThreshold !== undefined) {
            this.options.minProductivityScore = options.productivityThreshold;
        }
        // Execute
        await this.execute(parallelTasks);
    }
    /**
     * Get all results (V5 interface)
     */
    getAllResults() {
        const results = new Map();
        for (const task of [...this.completedTasks, ...this.failedTasks]) {
            results.set(task.id, {
                status: task.status,
                output: task.result || task.error || '',
                filesCreated: task.filesCreated,
                duration: task.endTime && task.startTime ? task.endTime - task.startTime : 0
            });
        }
        return results;
    }
    /**
     * Get all instances (V5 interface)
     */
    getAllInstances() {
        return Array.from(this.instances.values()).map(inst => ({
            id: inst.id,
            taskId: inst.currentTask?.id,
            status: inst.status,
            output: inst.output,
            filesCreated: Array.from(inst.filesCreated),
            productivityScore: inst.productivityScore,
            startTime: inst.startTime
        }));
    }
    /**
     * Kill a specific instance by ID (V5 interface - public wrapper)
     */
    killInstanceById(instanceId, reason) {
        const instance = this.instances.get(instanceId);
        if (instance) {
            this.killInstance(instance, reason);
            this.killedInstances.add(instanceId);
        }
    }
    /**
     * Cleanup (V5 interface)
     */
    async cleanup() {
        await this.shutdown();
    }
}
/**
 * Task decomposer - breaks complex tasks into parallel chunks
 */
export class TaskDecomposer {
    /**
     * Decompose a complex task into parallel subtasks
     */
    static decompose(prompt, strategy = 'orthogonal') {
        const tasks = [];
        // TODO: Implement smart decomposition
        // For now, just create a single task
        tasks.push({
            id: `task-${Date.now()}`,
            prompt,
            priority: 1,
            status: 'pending',
            outputLines: 0,
            lastActivity: Date.now(),
            filesCreated: []
        });
        return tasks;
    }
}
//# sourceMappingURL=parallel-executor.js.map