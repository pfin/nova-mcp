/**
 * Fixed version of ClaudeCodeSubprocessV3 - resolves race condition
 */
import { v4 as uuidv4 } from 'uuid';
import { getCompleteSystemPrompt } from './base-system-prompt.js';
import { SystemVerification } from './system-verification.js';
import { PtyExecutor } from './executors/pty-executor.js';
import { EventBus, EventType } from './core/event-bus.js';
import { execSync } from 'child_process';
export class ClaudeCodeSubprocessV3 {
    options;
    defaultOptions = {
        timeout: 600000, // 10 minutes default
    };
    eventBus;
    constructor(options = {}) {
        this.options = options;
        this.options = { ...this.defaultOptions, ...options };
        this.eventBus = options.eventBus || new EventBus({ logDir: './logs-v3' });
    }
    async execute(prompt, customOptions) {
        const startTime = Date.now();
        const id = customOptions?.taskId || uuidv4();
        const options = { ...this.options, ...customOptions };
        // Get bash date at start
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
        let verification = null;
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
        let exitCode = null;
        // Set up completion promise BEFORE starting execution
        const completionPromise = new Promise((resolve, reject) => {
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
                reject(event.payload);
            });
            executor.on('exit', (event) => {
                exitCode = event.payload.exitCode;
                if (exitCode !== 0) {
                    reject(new Error(`Claude exited with code ${exitCode}`));
                }
                else {
                    resolve();
                }
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
        });
        try {
            // Execute with PTY - now the handlers are already set up
            await executor.execute('claude', args, id);
            // Wait for completion
            await completionPromise;
            // Get bash date at end
            const endDateResult = execSync('date', { encoding: 'utf-8' }).trim();
            const duration = Date.now() - startTime;
            console.error(`[${new Date().toISOString()}] Task ${id} completed in ${duration}ms`);
            console.error(`[TEMPORAL] Task end: ${endDateResult}`);
            console.error(`[V3] NO TIMEOUT! Task ran for ${Math.floor(duration / 1000)}s`);
            // Clean up control characters from output
            const cleanOutput = output.replace(/\x00/g, '').replace(/\[\?25h/g, '').trim();
            const result = {
                id,
                prompt,
                response: cleanOutput,
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
        }
        catch (error) {
            // Get bash date at end even for errors
            const endDateResult = execSync('date', { encoding: 'utf-8' }).trim();
            const duration = Date.now() - startTime;
            console.error(`[${new Date().toISOString()}] Task ${id} failed after ${duration}ms`);
            console.error(`[V3] Error:`, error.message);
            const cleanOutput = output.replace(/\x00/g, '').replace(/\[\?25h/g, '').trim();
            return {
                id,
                prompt,
                response: cleanOutput || '',
                error: error.message,
                duration,
                timestamp: new Date(),
                startTime: startDateResult,
                endTime: endDateResult,
                taskType: options.taskType,
            };
        }
        finally {
            // Clean up
            executor.kill();
        }
    }
    /**
     * Execute with streaming output (for tools that need real-time feedback)
     */
    async executeStreaming(prompt, onData, customOptions) {
        // Implementation would be similar but with streaming support
        // For now, just use regular execute
        return this.execute(prompt, customOptions);
    }
    /**
     * Kill subprocess if running
     */
    kill() {
        // Placeholder for killing running subprocess
    }
}
//# sourceMappingURL=claude-subprocess-v3-fixed.js.map