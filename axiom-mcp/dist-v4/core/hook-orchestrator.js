/**
 * Axiom v4 - Hook-First Architecture
 * HookOrchestrator is the central hub for ALL execution
 */
import { EventEmitter } from 'events';
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
    constructor(db, eventBus, statusManager) {
        super();
        this.db = db;
        this.eventBus = eventBus;
        this.statusManager = statusManager;
    }
    /**
     * Register a hook
     */
    registerHook(hook) {
        for (const event of hook.events) {
            const eventHooks = this.hooks.get(event) || [];
            eventHooks.push(hook);
            // Sort by priority (higher first)
            eventHooks.sort((a, b) => b.priority - a.priority);
            this.hooks.set(event, eventHooks);
        }
        console.error(`[HookOrchestrator] Registered hook: ${hook.name} for events: ${hook.events.join(', ')}`);
    }
    /**
     * Main entry point - ALL requests go through here
     */
    async handleRequest(tool, args) {
        const taskId = `task-${Date.now()}`;
        const context = {
            event: HookEvent.REQUEST_RECEIVED,
            request: { tool, args },
            execution: { taskId, status: 'pending' }
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
                const streamContext = {
                    ...context,
                    event: HookEvent.EXECUTION_STREAM,
                    stream: { data, source: taskId }
                };
                const streamResult = await this.triggerHooks(HookEvent.EXECUTION_STREAM, streamContext);
                // Check for interventions
                if (streamResult.action === 'modify') {
                    // Inject intervention command
                    if (executor.injectCommand) {
                        await executor.injectCommand(streamResult.modifications.command);
                    }
                }
                // Notify monitors
                this.notifyMonitors('stream', { taskId, data });
            };
            // Execute with streaming
            let result;
            if (executor.execute.length === 4) {
                // PTY executor with full args
                result = await executor.execute(args.prompt || args.parentPrompt || '', args.systemPrompt || '', taskId, streamHandler);
            }
            else {
                // Simple executor
                result = await executor.execute(args, streamHandler);
            }
            // Phase 3: Completion
            context.execution.status = 'completed';
            context.execution.output = result;
            await this.triggerHooks(HookEvent.EXECUTION_COMPLETED, context);
            return result;
        }
        catch (error) {
            context.execution.status = 'failed';
            context.metadata = { error: error.message };
            await this.triggerHooks(HookEvent.EXECUTION_FAILED, context);
            throw error;
        }
    }
    /**
     * Trigger hooks for an event
     */
    async triggerHooks(event, context) {
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
                const hookResult = await hook.handler(fullContext);
                // First blocking/redirecting hook wins
                if (hookResult.action !== 'continue') {
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
                console.error(`[HookOrchestrator] Error in hook ${hook.name}:`, error);
                // Log but don't fail - hooks should be resilient
            }
        }
        return result;
    }
    /**
     * Select executor based on tool and args
     */
    async selectExecutor(tool, args) {
        // This can be overridden by hooks
        const executor = this.executors.get(tool);
        if (!executor) {
            throw new Error(`No executor registered for tool: ${tool}`);
        }
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
}
//# sourceMappingURL=hook-orchestrator.js.map