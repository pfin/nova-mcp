/**
 * Axiom v4 - Hook-First Architecture
 * HookOrchestrator is the central hub for ALL execution
 */

import { EventEmitter } from 'events';
import { Logger } from './logger.js';
import { logDebug } from './simple-logger.js';

export enum HookEvent {
  // Request lifecycle
  REQUEST_RECEIVED = 'request_received',
  REQUEST_VALIDATED = 'request_validated',
  REQUEST_BLOCKED = 'request_blocked',
  
  // Execution lifecycle  
  EXECUTION_STARTED = 'execution_started',
  EXECUTION_STREAM = 'execution_stream',
  EXECUTION_INTERVENTION = 'execution_intervention',
  EXECUTION_COMPLETED = 'execution_completed',
  EXECUTION_FAILED = 'execution_failed',
  
  // Monitoring events
  MONITOR_ATTACH = 'monitor_attach',
  MONITOR_DETACH = 'monitor_detach',
  
  // Parallel execution
  PARALLEL_SPAWN = 'parallel_spawn',
  PARALLEL_MERGE = 'parallel_merge',
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
  // v4: Access to core components
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

export class HookOrchestrator extends EventEmitter {
  private hooks: Map<HookEvent | string, Hook[]> = new Map();
  private db: any; // ConversationDB
  private eventBus: any; // EventBus
  private statusManager: any; // StatusManager
  private executors: Map<string, any> = new Map();
  private monitors: Set<any> = new Set();
  private activeTasks: Map<string, any> = new Map(); // Track active background tasks
  private logger: Logger;
  
  constructor(db: any, eventBus: any, statusManager?: any) {
    super();
    this.db = db;
    this.eventBus = eventBus;
    this.statusManager = statusManager;
    this.logger = Logger.getInstance();
  }
  
  /**
   * Register a hook
   */
  registerHook(hook: Hook): void {
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
  async handleRequest(tool: string, args: any): Promise<any> {
    const taskId = `task-${Date.now()}`;
    logDebug('ORCHESTRATOR', `handleRequest START - tool: ${tool}, taskId: ${taskId}`);
    logDebug('ORCHESTRATOR', 'args:', args);
    
    this.logger.info('HookOrchestrator', 'handleRequest', 'Request received', { tool, taskId, args });
    
    const context: HookContext = {
      event: HookEvent.REQUEST_RECEIVED,
      request: { tool, args },
      execution: { taskId, status: 'pending' },
      metadata: { taskId }
    };
    
    // Phase 1: Request validation hooks
    logDebug('ORCHESTRATOR', 'Phase 1: Triggering validation hooks');
    const validationResult = await this.triggerHooks(HookEvent.REQUEST_RECEIVED, context);
    logDebug('ORCHESTRATOR', 'Validation result:', validationResult);
    
    if (validationResult.action === 'block') {
      await this.triggerHooks(HookEvent.REQUEST_BLOCKED, {
        ...context,
        metadata: { reason: validationResult.reason }
      });
      throw new Error(validationResult.reason || 'Request blocked by hook');
    }
    
    if (validationResult.action === 'redirect') {
      // Redirect to different tool
      return this.handleRequest(
        validationResult.redirect!.tool,
        validationResult.redirect!.args
      );
    }
    
    // Apply any modifications
    if (validationResult.modifications) {
      args = { ...args, ...validationResult.modifications };
    }
    
    // Phase 2: Execution
    context.request!.args = args;
    context.execution!.status = 'running';
    
    logDebug('ORCHESTRATOR', 'Phase 2: Starting execution');
    await this.triggerHooks(HookEvent.EXECUTION_STARTED, context);
    
    try {
      // Get executor through hooks (allows dynamic executor selection)
      logDebug('ORCHESTRATOR', `Selecting executor for tool: ${tool}`);
      const executor = await this.selectExecutor(tool, args);
      logDebug('ORCHESTRATOR', `Executor selected: ${executor.constructor.name}`);
      
      // Set up stream monitoring
      const streamHandler = async (data: string) => {
        this.logger.trace('HookOrchestrator', 'streamHandler', 'Stream data received', {
          taskId,
          dataLength: data.length,
          preview: data.slice(0, 50)
        });
        
        // CRITICAL: Check for claude --print IMMEDIATELY
        if (data.includes('claude --print') || data.includes('claude -p')) {
          logDebug('ORCHESTRATOR', 'CRITICAL: claude --print detected in stream!');
          this.logger.error('HookOrchestrator', 'streamHandler', 'CRITICAL: claude --print detected', { taskId });
          
          // Immediate intervention
          if (executor.interrupt) {
            executor.interrupt();
          }
          
          const intervention = '\n[AXIOM CRITICAL] STOP! Do NOT use "claude --print" or "claude -p"!\n' +
                             'claude --print CANNOT be course-corrected once started.\n' +
                             'You can only kill it, not redirect it. This breaks the entire intervention model.\n' +
                             'Use interactive claude session instead for bidirectional communication.\n\n';
          
          if (executor.injectCommand) {
            await executor.injectCommand(intervention);
          } else if (executor.write) {
            executor.write(intervention);
          }
          
          // Notify through stream
          if (args.notificationSender) {
            await args.notificationSender(taskId, intervention);
          }
          
          // Mark task as failed
          const task = this.activeTasks.get(taskId);
          if (task) {
            task.status = 'failed';
            task.error = 'claude --print detected and blocked';
          }
          
          // Don't process further
          return;
        }
        
        const streamContext: HookContext = {
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
        
        // Update task output
        const task = this.activeTasks.get(taskId);
        if (task) {
          task.output += data;
          if (!task.streamData) task.streamData = [];
          task.streamData.push(data);
        }
        
        // Send notification if sender provided
        if (args.notificationSender) {
          try {
            await args.notificationSender(taskId, data);
          } catch (error) {
            this.logger.warn('HookOrchestrator', 'streamHandler', 'Failed to send notification', { taskId, error });
          }
        }
        
        // Notify monitors
        this.notifyMonitors('stream', { taskId, data });
      };
      
      // Check if verbose mode is enabled
      const isVerbose = args.verboseMasterMode === true;
      logDebug('ORCHESTRATOR', `Verbose mode: ${isVerbose}`);
      
      if (isVerbose) {
        logDebug('ORCHESTRATOR', 'VERBOSE MODE - Starting non-blocking execution');
        // Track task info
        const taskInfo = {
          taskId,
          status: 'running',
          startTime: Date.now(),
          prompt: args.prompt || args.parentPrompt || '',
          output: '',
          streamData: [],
          executor: executor  // Store executor reference for sending messages
        };
        this.activeTasks.set(taskId, taskInfo);
        
        // NON-BLOCKING: Start execution without awaiting
        logDebug('ORCHESTRATOR', 'Starting executor.execute without await');
        const executionPromise = executor.execute.length === 4
          ? executor.execute(
              args.prompt || args.parentPrompt || '',
              args.systemPrompt || '',
              taskId,
              streamHandler
            )
          : executor.execute(args, streamHandler);
        logDebug('ORCHESTRATOR', 'Execution started in background');
        
        // Handle completion in background
        executionPromise
          .then(async (output: any) => {
            const task = this.activeTasks.get(taskId);
            if (task) {
              task.status = 'completed';
              task.output = output;
              task.endTime = Date.now();
            }
            context.execution!.status = 'completed';
            context.execution!.output = output;
            await this.triggerHooks(HookEvent.EXECUTION_COMPLETED, context);
            this.logger.info('HookOrchestrator', 'backgroundExecution', 'Task completed', { taskId });
          })
          .catch(async (error: any) => {
            const task = this.activeTasks.get(taskId);
            if (task) {
              task.status = 'failed';
              task.error = error instanceof Error ? error.message : String(error);
              task.endTime = Date.now();
            }
            context.execution!.status = 'failed';
            context.metadata = { error: error instanceof Error ? error.message : String(error) };
            await this.triggerHooks(HookEvent.EXECUTION_FAILED, context);
            this.logger.error('HookOrchestrator', 'backgroundExecution', 'Task failed', { taskId, error });
          });
        
        // Return immediately with task info
        logDebug('ORCHESTRATOR', 'Returning immediate response for verbose mode');
        const response = {
          taskId,
          status: 'executing',
          message: args.notificationSender 
            ? 'Task started. Output streaming via notifications.' 
            : 'Task started in background. Use axiom_output to check progress.',
          instructions: {
            monitor: args.notificationSender 
              ? 'Watch notifications for real-time output' 
              : 'Use axiom_output to read accumulated output',
            interrupt: 'Use axiom_send to communicate with task',
            completion: 'Task will complete or fail asynchronously',
            checkStatus: `Use axiom_status to check progress`
          }
        };
        logDebug('ORCHESTRATOR', 'Response:', response);
        return response;
      } else {
        // BLOCKING: Traditional mode waits for completion
        logDebug('ORCHESTRATOR', 'BLOCKING MODE - Awaiting execution completion');
        let result;
        if (executor.execute.length === 4) {
          logDebug('ORCHESTRATOR', 'Calling executor.execute with 4 params');
          result = await executor.execute(
            args.prompt || args.parentPrompt || '',
            args.systemPrompt || '',
            taskId,
            streamHandler
          );
        } else {
          logDebug('ORCHESTRATOR', 'Calling executor.execute with args');
          result = await executor.execute(args, streamHandler);
        }
        logDebug('ORCHESTRATOR', 'Execution completed, result type:', typeof result);
        
        context.execution!.status = 'completed';
        context.execution!.output = result;
        
        await this.triggerHooks(HookEvent.EXECUTION_COMPLETED, context);
        
        return result;
      }
      
    } catch (error) {
      context.execution!.status = 'failed';
      context.metadata = { error: error instanceof Error ? error.message : String(error) };
      
      await this.triggerHooks(HookEvent.EXECUTION_FAILED, context);
      throw error;
    }
  }
  
  /**
   * Trigger hooks for an event
   */
  async triggerHooks(event: HookEvent | string, context: Partial<HookContext>): Promise<HookResult> {
    const timerKey = `hooks-${event}-${Date.now()}`;
    this.logger.startTimer(timerKey);
    
    this.logger.debug('HookOrchestrator', 'triggerHooks', `Triggering hooks for event: ${event}`, {
      event,
      hooksCount: this.hooks.get(event)?.length || 0,
      taskId: context.execution?.taskId
    });
    
    // Build full context
    const fullContext: HookContext = {
      event: event as HookEvent,
      db: this.db,
      eventBus: this.eventBus,
      statusManager: this.statusManager,
      ...context
    };
    
    const hooks = this.hooks.get(event) || [];
    let result: HookResult = { action: 'continue' };
    
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
      } catch (error) {
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
  private async selectExecutor(tool: string, args: any): Promise<any> {
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
  registerExecutor(tool: string, executor: any): void {
    this.executors.set(tool, executor);
  }
  
  /**
   * Attach a monitor (VerboseMonitor, WebSocket, etc)
   */
  attachMonitor(monitor: any): void {
    this.monitors.add(monitor);
    this.triggerHooks(HookEvent.MONITOR_ATTACH, {
      event: HookEvent.MONITOR_ATTACH,
      metadata: { monitor: monitor.constructor.name }
    });
  }
  
  /**
   * Notify all monitors
   */
  private notifyMonitors(event: string, data: any): void {
    for (const monitor of this.monitors) {
      if (monitor.notify) {
        monitor.notify(event, data);
      }
    }
  }
  
  /**
   * Enable parallel execution through hooks
   */
  async spawnParallel(requests: Array<{ tool: string; args: any }>): Promise<any[]> {
    await this.triggerHooks(HookEvent.PARALLEL_SPAWN, {
      event: HookEvent.PARALLEL_SPAWN,
      metadata: { count: requests.length }
    });
    
    // Execute in parallel
    const results = await Promise.all(
      requests.map(req => this.handleRequest(req.tool, req.args))
    );
    
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
  getTaskStatus(taskId?: string): any {
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
  clearCompletedTasks(): void {
    for (const [id, task] of this.activeTasks) {
      if (task.status === 'completed' || task.status === 'failed') {
        this.activeTasks.delete(id);
      }
    }
  }
  
  /**
   * Get an active task by ID (alias for getTaskStatus)
   */
  getActiveTask(taskId: string): any {
    return this.activeTasks.get(taskId);
  }
  
  /**
   * Get all active tasks
   */
  getAllActiveTasks(): any[] {
    const tasks = [];
    for (const [id, task] of this.activeTasks) {
      tasks.push({ taskId: id, ...task });
    }
    return tasks;
  }
}