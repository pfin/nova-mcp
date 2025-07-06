/**
 * Claude Subprocess v3 - Uses PTY instead of execSync
 * 
 * CRITICAL IMPROVEMENTS:
 * - No more 30-second timeout
 * - Real-time streaming output
 * - Heartbeat prevents any timeout
 * - Maintains v1 API compatibility
 */

import { v4 as uuidv4 } from 'uuid';
import { getCompleteSystemPrompt } from '../src/base-system-prompt.js';
import { SystemVerification, VerificationProof } from '../src/system-verification.js';
import { PtyExecutor } from './executors/pty-executor.js';
import { EventBus, EventType } from './core/event-bus.js';
import { execSync } from 'child_process';

export interface ClaudeCodeOptions {
  model?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  addDir?: string[];
  timeout?: number;
  systemPrompt?: string;
  taskType?: string;
  includeDate?: boolean;
  requireImplementation?: boolean;
  eventBus?: EventBus;
  enableMonitoring?: boolean;
  enableIntervention?: boolean;
  taskId?: string;
  title?: string;
  parentId?: string;
  depth?: number;
  onExecutorCreated?: (executor: PtyExecutor) => void;
}

export interface ClaudeCodeResult {
  id: string;
  prompt: string;
  response: string;
  error?: string;
  duration: number;
  timestamp: Date;
  startTime: string;
  endTime: string;
  taskType?: string;
  verification?: VerificationProof;
  verificationReport?: string;
}

export class ClaudeCodeSubprocessV3 {
  private defaultOptions: ClaudeCodeOptions = {
    timeout: 600000, // 10 minutes default
  };
  private eventBus: EventBus;

  constructor(private options: ClaudeCodeOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
    this.eventBus = options.eventBus || new EventBus({ logDir: './logs-v3' });
  }

  /**
   * Execute a prompt using PTY instead of execSync
   * Maintains API compatibility with v1
   */
  async execute(prompt: string, customOptions?: ClaudeCodeOptions): Promise<ClaudeCodeResult> {
    const startTime = Date.now();
    const id = customOptions?.taskId || uuidv4();
    const options = { ...this.options, ...customOptions };

    // Get bash date at start (still using execSync for simple date command)
    const startDateResult = execSync('date', { encoding: 'utf-8' }).trim();

    // Log start
    console.error(`[${new Date().toISOString()}] Starting Claude Code task ${id}`);
    console.error(`[TEMPORAL] Task start: ${startDateResult}`);
    console.error(`[V3] Using PTY executor - no timeout!`);

    // Emit task start event
    this.eventBus.logEvent({
      taskId: id,
      workerId: 'main',
      event: EventType.TASK_START,
      payload: {
        prompt: prompt,
        title: options.title || prompt.substring(0, 50),
        parentId: options.parentId,
        depth: options.depth || 0,
        taskType: options.taskType
      }
    });

    // Build the prompt with complete system prompt
    const completeSystemPrompt = getCompleteSystemPrompt(options.systemPrompt, options.taskType);
    let fullPrompt = `${completeSystemPrompt}\n\n${prompt}`;

    // Build command args
    const args = ['--dangerously-skip-permissions', '-p', fullPrompt];

    // Add model if specified
    if (options.model) {
      args.push('--model', options.model);
    }

    // Add allowed tools
    if (options.allowedTools && options.allowedTools.length > 0) {
      args.push('--allowedTools', options.allowedTools.join(','));
    }

    // Add disallowed tools
    if (options.disallowedTools && options.disallowedTools.length > 0) {
      args.push('--disallowedTools', options.disallowedTools.join(','));
    }

    // Add directories
    if (options.addDir && options.addDir.length > 0) {
      options.addDir.forEach(dir => {
        args.push('--add-dir', dir);
      });
    }

    // Initialize system verification if required
    let verification: SystemVerification | null = null;
    if (options.requireImplementation) {
      verification = new SystemVerification();
      console.error(`[VERIFICATION] System-level verification enabled for task ${id}`);
    }

    // Create PTY executor with monitoring if enabled
    const executor = new PtyExecutor({
      cwd: process.cwd(),
      heartbeatInterval: 180_000, // 3 minutes
      enableMonitoring: options.enableMonitoring ?? false,
      enableIntervention: options.enableIntervention ?? false,
      onExecutorCreated: options.onExecutorCreated
    });

    // Collect output
    let output = '';
    let hasError = false;

    // Set up event handlers
    executor.on('data', (event) => {
      output += event.payload;
      this.eventBus.logEvent({
        taskId: id,
        workerId: 'main',
        event: EventType.CLAUDE_STDOUT,
        payload: event.payload
      });
    });

    executor.on('heartbeat', (event) => {
      console.error('[V3] Heartbeat sent - preventing timeout');
      this.eventBus.logEvent({
        taskId: id,
        workerId: 'main',
        event: EventType.HEARTBEAT,
        payload: event.payload
      });
    });

    executor.on('error', (event) => {
      console.error('[V3] PTY Error:', event.payload);
      hasError = true;
      this.eventBus.logEvent({
        taskId: id,
        workerId: 'main',
        event: EventType.TASK_FAILED,
        payload: event.payload
      });
    });

    // Handle violations and interventions if monitoring is enabled
    if (options.enableMonitoring) {
      executor.on('violation', (event) => {
        console.error(`[VIOLATION] ${event.payload.ruleName}: ${event.payload.match}`);
        this.eventBus.logEvent({
          taskId: id,
          workerId: 'main',
          event: EventType.CODE_VIOLATION,
          payload: event.payload
        });
      });

      executor.on('intervention', (event) => {
        console.error(`[INTERVENTION] Injecting correction: ${event.payload}`);
        this.eventBus.logEvent({
          taskId: id,
          workerId: 'main',
          event: EventType.INTERVENTION,
          payload: event.payload
        });
      });
    }

    try {
      // Execute with PTY
      await executor.execute('claude', args, id);

      // Wait for completion
      await new Promise<void>((resolve, reject) => {
        executor.on('exit', (event) => {
          if (event.payload.exitCode !== 0) {
            reject(new Error(`Claude exited with code ${event.payload.exitCode}`));
          } else {
            resolve();
          }
        });

        executor.on('error', (event) => {
          reject(event.payload);
        });
      });

      // Get bash date at end
      const endDateResult = execSync('date', { encoding: 'utf-8' }).trim();
      
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] Task ${id} completed in ${duration}ms`);
      console.error(`[TEMPORAL] Task end: ${endDateResult}`);
      console.error(`[V3] NO TIMEOUT! Task ran for ${Math.floor(duration / 1000)}s`);

      const result: ClaudeCodeResult = {
        id,
        prompt,
        response: output.trim(),
        duration,
        timestamp: new Date(),
        startTime: startDateResult,
        endTime: endDateResult,
        taskType: options.taskType,
      };

      // Perform system verification if enabled
      if (verification) {
        const proof = verification.gatherProof();
        result.verification = proof;
        result.verificationReport = verification.createReport(proof);
        
        console.error(`[VERIFICATION] Implementation: ${proof.hasImplementation}, Tests: ${proof.hasTests}, Pass: ${proof.testsPass}`);
        
        // Enforce verification requirements
        if (options.requireImplementation && !proof.hasImplementation) {
          throw new Error(`Verification Failed: No implementation detected\n${result.verificationReport}`);
        }
      }

      return result;

    } catch (error: any) {
      // Get bash date at end even for errors
      const endDateResult = execSync('date', { encoding: 'utf-8' }).trim();
      const duration = Date.now() - startTime;

      console.error(`[${new Date().toISOString()}] Task ${id} failed after ${duration}ms`);
      console.error(`[V3] Error:`, error.message);

      return {
        id,
        prompt,
        response: output || '',
        error: error.message,
        duration,
        timestamp: new Date(),
        startTime: startDateResult,
        endTime: endDateResult,
        taskType: options.taskType,
      };
    } finally {
      // Clean up
      executor.kill();
    }
  }

  /**
   * Execute with streaming output (for tools that need real-time feedback)
   */
  async executeStreaming(
    prompt: string, 
    onData: (data: string) => void,
    customOptions?: ClaudeCodeOptions
  ): Promise<ClaudeCodeResult> {
    const startTime = Date.now();
    const id = uuidv4();
    const options = { ...this.options, ...customOptions };

    // Similar setup as execute()
    const startDateResult = execSync('date', { encoding: 'utf-8' }).trim();
    const completeSystemPrompt = getCompleteSystemPrompt(options.systemPrompt, options.taskType);
    let fullPrompt = `${completeSystemPrompt}\n\n${prompt}`;

    const args = ['--dangerously-skip-permissions', '-p', fullPrompt];
    if (options.model) args.push('--model', options.model);

    const executor = new PtyExecutor({
      cwd: process.cwd(),
      heartbeatInterval: 180_000,
    });

    let output = '';

    executor.on('data', (event) => {
      output += event.payload;
      onData(event.payload); // Stream to caller
      this.eventBus.logEvent({
        taskId: id,
        workerId: 'main',
        event: EventType.CLAUDE_DELTA,
        payload: event.payload
      });
    });

    try {
      await executor.execute('claude', args, id);

      await new Promise<void>((resolve, reject) => {
        executor.on('exit', (event) => {
          if (event.payload.exitCode !== 0) {
            reject(new Error(`Claude exited with code ${event.payload.exitCode}`));
          } else {
            resolve();
          }
        });
      });

      const endDateResult = execSync('date', { encoding: 'utf-8' }).trim();
      const duration = Date.now() - startTime;

      return {
        id,
        prompt,
        response: output.trim(),
        duration,
        timestamp: new Date(),
        startTime: startDateResult,
        endTime: endDateResult,
        taskType: options.taskType,
      };

    } catch (error: any) {
      const endDateResult = execSync('date', { encoding: 'utf-8' }).trim();
      const duration = Date.now() - startTime;

      return {
        id,
        prompt,
        response: output || '',
        error: error.message,
        duration,
        timestamp: new Date(),
        startTime: startDateResult,
        endTime: endDateResult,
        taskType: options.taskType,
      };
    } finally {
      executor.kill();
    }
  }
}