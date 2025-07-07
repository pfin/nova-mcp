/**
 * Axiom v4 - Hook-First Architecture
 * HookOrchestrator is the central hub for ALL execution
 */
import { EventEmitter } from 'events';
import { Logger } from './logger.js';
export var HookEvent;
(function (HookEvent) {
    // Request lifecycle
    HookEvent["REQUEST_RECEIVED"] = "request_received";
    HookEvent["REQUEST_VALIDATED"] = "request_validated";
    HookEvent["REQUEST_BLOCKED"] = "request_blocked";
    // Execution lifecycle  
    HookEvent["EXECUTION_STARTED"] = "execution_started";
    HookEvent["EXECUTION_STREAM"] = "execution_stream";
    HookEvent["EXECUTION_INTERVENTION"] = "execution_intervention";
    HookEvent["EXECUTION_COMPLETED"] = "execution_completed";
    HookEvent["EXECUTION_FAILED"] = "execution_failed";
    // Monitoring events
    HookEvent["MONITOR_ATTACH"] = "monitor_attach";
    HookEvent["MONITOR_DETACH"] = "monitor_detach";
    // Parallel execution
    HookEvent["PARALLEL_SPAWN"] = "parallel_spawn";
    HookEvent["PARALLEL_MERGE"] = "parallel_merge";
})(HookEvent || (HookEvent = {}));
export class HookOrchestrator extends EventEmitter {
    hooks = new Map();
    db; // ConversationDB
    eventBus; // EventBus
    statusManager; // StatusManager
    executors = new Map();
    monitors = new Set();
    activeTasks = new Map(); // Track active background tasks
    logger;
    constructor(db, eventBus, statusManager) {
        super();
        this.db = db;
        this.eventBus = eventBus;
        this.statusManager = statusManager;
        this.logger = Logger.getInstance();
    }
    /**
     * Register a hook
     */
    registerHook(hook) {
        this.logger.info('HookOrchestrator', 'registerHook', 'Registering hook', {
            name: hook.name,
            events: hook.events,
            priority: hook.priority
        });
        for (const event of hook.events) {
            const eventHooks = this.hooks.get(event) || [];
            eventHooks.push(hook);
            // Sort by priority (higher first)
            eventHooks.sort((a, b) => b.priority - a.priority);
            this.hooks.set(event, eventHooks);
        }
        this.logger.debug('HookOrchestrator', 'registerHook', 'Hook registered successfully', {
            name: hook.name,
            totalHooks: Array.from(this.hooks.values()).flat().length
        });
    }
    /**
     * Main entry point - ALL requests go through here
     */
    async handleRequest(tool, args) {
        const taskId = `task-${Date.now()}`;
        this.logger.info('HookOrchestrator', 'handleRequest', 'Request received', { tool, taskId, args });
        const context = {
            event: HookEvent.REQUEST_RECEIVED,
            request: { tool, args },
            execution: { taskId, status: 'pending' },
            metadata: { taskId }
        };
        // Phase 1: Request validation hooks
        const validationResult = await this.triggerHooks(HookEvent.REQUEST_RECEIVED, context);
        if (validationResult.action === 'block') {
            await this.triggerHooks(HookEvent.REQUEST_BLOCKED, {
                ...context,
                metadata: { reason: validationResult.reason }
            });
            throw new Error(validationResult.reason || 'Request blocked by hook');
        }
        if (validationResult.action === 'redirect') {
            // Redirect to different tool
            return this.handleRequest(validationResult.redirect.tool, validationResult.redirect.args);
        }
        // Apply any modifications
        if (validationResult.modifications) {
            args = { ...args, ...validationResult.modifications };
        }
        // Phase 2: Execution
        context.request.args = args;
        context.execution.status = 'running';
        await this.triggerHooks(HookEvent.EXECUTION_STARTED, context);
        try {
            // Get executor through hooks (allows dynamic executor selection)
            const executor = await this.selectExecutor(tool, args);
            // Set up stream monitoring
            const streamHandler = async (data) => {
                this.logger.trace('HookOrchestrator', 'streamHandler', 'Stream data received', {
                    taskId,
                    dataLength: data.length,
                    preview: data.slice(0, 50)
                });
                const streamContext = {
                    ...context,
                    event: HookEvent.EXECUTION_STREAM,
                    stream: { data, source: taskId }
                };
                const streamResult = await this.triggerHooks(HookEvent.EXECUTION_STREAM, streamContext);
                // Check for interventions
                if (streamResult.action === 'modify') {
                    this.logger.warn('HookOrchestrator', 'streamHandler', 'Intervention detected', {
                        taskId,
                        command: streamResult.modifications?.command
                    });
                    // Inject intervention command
                    if (executor.injectCommand) {
                        await executor.injectCommand(streamResult.modifications.command);
                        this.logger.info('HookOrchestrator', 'streamHandler', 'Intervention injected', { taskId });
                    }
                }
                // Notify monitors
                this.notifyMonitors('stream', { taskId, data });
            };
            // Check if verbose mode is enabled
            const isVerbose = args.verboseMasterMode === true;
            if (isVerbose) {
                // Track task info
                const taskInfo = {
                    taskId,
                    status: 'running',
                    startTime: Date.now(),
                    prompt: args.prompt || args.parentPrompt || '',
                    output: '',
                    streamData: []
                };
                this.activeTasks.set(taskId, taskInfo);
                // NON-BLOCKING: Start execution without awaiting
                const executionPromise = executor.execute.length === 4
                    ? executor.execute(args.prompt || args.parentPrompt || '', args.systemPrompt || '', taskId, streamHandler)
                    : executor.execute(args, streamHandler);
                // Handle completion in background
                executionPromise
                    .then(async (output) => {
                    const task = this.activeTasks.get(taskId);
                    if (task) {
                        task.status = 'completed';
                        task.output = output;
                        task.endTime = Date.now();
                    }
                    context.execution.status = 'completed';
                    context.execution.output = output;
                    await this.triggerHooks(HookEvent.EXECUTION_COMPLETED, context);
                    this.logger.info('HookOrchestrator', 'backgroundExecution', 'Task completed', { taskId });
                })
                    .catch(async (error) => {
                    const task = this.activeTasks.get(taskId);
                    if (task) {
                        task.status = 'failed';
                        task.error = error instanceof Error ? error.message : String(error);
                        task.endTime = Date.now();
                    }
                    context.execution.status = 'failed';
                    context.metadata = { error: error instanceof Error ? error.message : String(error) };
                    await this.triggerHooks(HookEvent.EXECUTION_FAILED, context);
                    this.logger.error('HookOrchestrator', 'backgroundExecution', 'Task failed', { taskId, error });
                });
                // Return immediately with task info
                return {
                    taskId,
                    status: 'executing',
                    message: 'Task started in background. Updates streaming via hooks.',
                    instructions: {
                        monitor: 'Watch console output for real-time updates',
                        interrupt: 'Send interrupt commands through the stream',
                        completion: 'Task will complete or fail asynchronously',
                        checkStatus: `Use getTaskStatus('${taskId}') to check progress`
                    }
                };
            }
            else {
                // BLOCKING: Traditional mode waits for completion
                let result;
                if (executor.execute.length === 4) {
                    result = await executor.execute(args.prompt || args.parentPrompt || '', args.systemPrompt || '', taskId, streamHandler);
                }
                else {
                    result = await executor.execute(args, streamHandler);
                }
                context.execution.status = 'completed';
                context.execution.output = result;
                await this.triggerHooks(HookEvent.EXECUTION_COMPLETED, context);
                return result;
            }
        }
        catch (error) {
            context.execution.status = 'failed';
            context.metadata = { error: error instanceof Error ? error.message : String(error) };
            await this.triggerHooks(HookEvent.EXECUTION_FAILED, context);
            throw error;
        }
    }
    /**
     * Trigger hooks for an event
     */
    async triggerHooks(event, context) {
        const timerKey = `hooks-${event}-${Date.now()}`;
        this.logger.startTimer(timerKey);
        this.logger.debug('HookOrchestrator', 'triggerHooks', `Triggering hooks for event: ${event}`, {
            event,
            hooksCount: this.hooks.get(event)?.length || 0,
            taskId: context.execution?.taskId
        });
        // Build full context
        const fullContext = {
            event: event,
            db: this.db,
            eventBus: this.eventBus,
            statusManager: this.statusManager,
            ...context
        };
        const hooks = this.hooks.get(event) || [];
        let result = { action: 'continue' };
        for (const hook of hooks) {
            try {
                this.logger.logHook(hook.name, event.toString(), 'start');
                const hookResult = await hook.handler(fullContext);
                this.logger.logHook(hook.name, event.toString(), 'end', hookResult);
                // First blocking/redirecting hook wins
                if (hookResult.action !== 'continue') {
                    const duration = this.logger.endTimer(timerKey);
                    this.logger.info('HookOrchestrator', 'triggerHooks', `Hook ${hook.name} blocked/redirected execution`, {
                        event,
                        action: hookResult.action,
                        reason: hookResult.reason,
                        duration
                    });
                    return hookResult;
                }
                // Accumulate modifications
                if (hookResult.modifications) {
                    result.modifications = {
                        ...result.modifications,
                        ...hookResult.modifications
                    };
                }
            }
            catch (error) {
                this.logger.error('HookOrchestrator', 'triggerHooks', `Error in hook ${hook.name}`, {
                    event,
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
                // Log but don't fail - hooks should be resilient
            }
        }
        const duration = this.logger.endTimer(timerKey);
        this.logger.debug('HookOrchestrator', 'triggerHooks', 'Hooks completed', {
            event,
            duration,
            modifications: result.modifications ? Object.keys(result.modifications) : []
        });
        return result;
    }
    /**
     * Select executor based on tool and args
     */
    async selectExecutor(tool, args) {
        this.logger.debug('HookOrchestrator', 'selectExecutor', 'Selecting executor', { tool, executors: Array.from(this.executors.keys()) });
        // This can be overridden by hooks
        const executor = this.executors.get(tool);
        if (!executor) {
            this.logger.error('HookOrchestrator', 'selectExecutor', 'No executor found', { tool });
            throw new Error(`No executor registered for tool: ${tool}`);
        }
        this.logger.debug('HookOrchestrator', 'selectExecutor', 'Executor selected', { tool, executorType: executor.constructor?.name });
        return executor;
    }
    /**
     * Register an executor
     */
    registerExecutor(tool, executor) {
        this.executors.set(tool, executor);
    }
    /**
     * Attach a monitor (VerboseMonitor, WebSocket, etc)
     */
    attachMonitor(monitor) {
        this.monitors.add(monitor);
        this.triggerHooks(HookEvent.MONITOR_ATTACH, {
            event: HookEvent.MONITOR_ATTACH,
            metadata: { monitor: monitor.constructor.name }
        });
    }
    /**
     * Notify all monitors
     */
    notifyMonitors(event, data) {
        for (const monitor of this.monitors) {
            if (monitor.notify) {
                monitor.notify(event, data);
            }
        }
    }
    /**
     * Enable parallel execution through hooks
     */
    async spawnParallel(requests) {
        await this.triggerHooks(HookEvent.PARALLEL_SPAWN, {
            event: HookEvent.PARALLEL_SPAWN,
            metadata: { count: requests.length }
        });
        // Execute in parallel
        const results = await Promise.all(requests.map(req => this.handleRequest(req.tool, req.args)));
        // Merge results through hooks
        const mergeResult = await this.triggerHooks(HookEvent.PARALLEL_MERGE, {
            event: HookEvent.PARALLEL_MERGE,
            metadata: { results }
        });
        return mergeResult.modifications?.mergedResult || results;
    }
    /**
     * Get status of active tasks
     */
    getTaskStatus(taskId) {
        if (taskId) {
            return this.activeTasks.get(taskId);
        }
        // Return all active tasks
        const tasks = [];
        for (const [id, task] of this.activeTasks) {
            tasks.push({ id, ...task });
        }
        return tasks;
    }
    /**
     * Clear completed/failed tasks
     */
    clearCompletedTasks() {
        for (const [id, task] of this.activeTasks) {
            if (task.status === 'completed' || task.status === 'failed') {
                this.activeTasks.delete(id);
            }
        }
    }
}
//# sourceMappingURL=hook-orchestrator.js.map