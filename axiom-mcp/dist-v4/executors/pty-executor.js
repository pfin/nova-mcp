import { spawn } from 'node-pty';
import { EventEmitter } from 'events';
import * as os from 'os';
import { HookEvent } from '../core/hook-orchestrator.js';
import { Logger } from '../core/logger.js';
import { logDebug } from '../core/simple-logger.js';
const logger = Logger.getInstance();
export class PtyExecutor extends EventEmitter {
    options;
    pty;
    output = '';
    isComplete = false;
    interventionQueue = [];
    hookOrchestrator;
    constructor(options = {}) {
        super();
        this.options = options;
        this.hookOrchestrator = options.hookOrchestrator;
    }
    async execute(prompt, systemPrompt, taskId, streamHandler) {
        logger.info('PtyExecutor', 'execute', 'Starting execution', {
            taskId,
            promptLength: prompt.length,
            hasStreamHandler: !!streamHandler
        });
        return new Promise((resolve, reject) => {
            const shell = this.options.shell || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');
            const cwd = this.options.cwd || process.cwd();
            logger.debug('PtyExecutor', 'execute', 'Creating PTY instance', { shell, cwd });
            // Create PTY instance
            logDebug('PTY', 'About to spawn PTY', {
                shell,
                cwd,
                envKeys: Object.keys({ ...process.env, ...this.options.env })
            });
            try {
                this.pty = spawn(shell, [], {
                    name: 'xterm-color',
                    cols: 120,
                    rows: 30,
                    cwd,
                    env: {
                        ...process.env,
                        ...this.options.env,
                        FORCE_COLOR: '0', // Disable ANSI colors
                        PROMPT: prompt,
                        SYSTEM_PROMPT: systemPrompt,
                        TASK_ID: taskId
                    }
                });
                logDebug('PTY', 'PTY spawned successfully', {
                    pid: this.pty.pid,
                    process: this.pty.process
                });
            }
            catch (error) {
                logDebug('PTY', 'FAILED to spawn PTY', {
                    error: error instanceof Error ? error.message : error,
                    stack: error instanceof Error ? error.stack : undefined
                });
                reject(error);
                return;
            }
            logger.info('PtyExecutor', 'execute', 'PTY created, setting up handlers', { taskId });
            // Verify PTY is really alive
            logDebug('PTY', 'Verifying PTY is alive', {
                pid: this.pty.pid,
                cols: this.pty.cols,
                rows: this.pty.rows
            });
            // Setup onData handler first
            logDebug('PTY', 'Setting up onData handler');
            let dataHandlerSet = false;
            // Handle data with hook integration
            this.pty.onData(async (data) => {
                if (!dataHandlerSet) {
                    dataHandlerSet = true;
                    logDebug('PTY', 'First onData event received!');
                }
                logDebug('PTY', `onData called - received ${data.length} bytes`, {
                    taskId,
                    preview: data.slice(0, 200).replace(/\n/g, '\\n').replace(/\r/g, '\\r')
                });
                logger.trace('PtyExecutor', 'onData', 'Received data', {
                    taskId,
                    dataLength: data.length,
                    preview: data.slice(0, 100).replace(/\n/g, '\\n')
                });
                this.output += data;
                // v4: Process stream through hooks
                if (this.hookOrchestrator) {
                    const result = await this.hookOrchestrator.triggerHooks(HookEvent.EXECUTION_STREAM, {
                        stream: { data, source: taskId },
                        execution: { taskId, status: 'running' }
                    });
                    // Check for interventions
                    if (result.modifications?.command) {
                        this.injectCommand(result.modifications.command);
                    }
                }
                // Call stream handler
                if (streamHandler) {
                    streamHandler(data);
                }
                // Emit for other listeners
                this.emit('data', data);
                // Check for process idle
                this.resetIdleTimer();
            });
            // Handle exit
            logDebug('PTY', 'Setting up onExit handler');
            this.pty.onExit((exitCode) => {
                logDebug('PTY', 'onExit triggered', { exitCode });
                logger.info('PtyExecutor', 'onExit', 'PTY process exited', {
                    taskId,
                    exitCode: exitCode.exitCode,
                    outputLength: this.output.length
                });
                this.isComplete = true;
                if (exitCode.exitCode === 0) {
                    resolve(this.output);
                }
                else {
                    reject(new Error(`Process exited with code ${exitCode.exitCode}`));
                }
            });
            // v4: Notify hooks of execution start
            if (this.hookOrchestrator) {
                logger.debug('PtyExecutor', 'execute', 'Triggering execution started hooks', { taskId });
                this.hookOrchestrator.triggerHooks(HookEvent.EXECUTION_STARTED, {
                    execution: { taskId, status: 'running' },
                    request: { tool: 'pty_executor', args: { prompt, systemPrompt } }
                });
            }
            // Start claude in interactive mode
            const claudeCommand = `claude\n`;
            logger.info('PtyExecutor', 'execute', 'Starting interactive Claude', {
                taskId,
                prompt: prompt.slice(0, 100)
            });
            logDebug('PTY', 'Starting Claude interactive session', {
                ptyPid: this.pty.pid
            });
            // Start Claude
            this.pty.write(claudeCommand);
            // Wait for Claude to start, then send the prompt
            setTimeout(async () => {
                logDebug('PTY', 'Sending prompt to Claude with human-like typing', {
                    prompt: prompt.slice(0, 100)
                });
                if (this.pty) {
                    // Type the prompt character by character with human-like delays
                    for (const char of prompt) {
                        this.pty.write(char);
                        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
                    }
                    // Wait a bit before submitting
                    await new Promise(resolve => setTimeout(resolve, 300));
                    // Submit with Ctrl+Enter
                    logDebug('PTY', 'Submitting prompt with Ctrl+Enter');
                    this.pty.write('\x0d'); // Ctrl+Enter to submit
                    // Monitor for file creation prompts during execution
                    let lastApprovalSent = 0;
                    const monitorInterval = setInterval(() => {
                        const recentOutput = this.output.slice(-2000); // Look at more output
                        // Check for file creation prompts - handle various formats
                        if ((recentOutput.includes('Do you want to create') ||
                            recentOutput.includes('Do you trust the files')) &&
                            (recentOutput.includes('1. Yes') ||
                                recentOutput.includes('❯ 1. Yes') ||
                                recentOutput.includes('> 1. Yes'))) {
                            // Avoid sending duplicate approvals
                            const now = Date.now();
                            if (now - lastApprovalSent > 2000) { // Wait 2s between approvals
                                logDebug('PTY', 'Approval prompt detected, auto-approving with "1"');
                                if (this.pty) {
                                    this.pty.write('1'); // Send just "1" without newline first
                                    setTimeout(() => {
                                        if (this.pty)
                                            this.pty.write('\n'); // Then send newline
                                    }, 100);
                                }
                                lastApprovalSent = now;
                            }
                        }
                        // Stop monitoring when task completes
                        if (this.isComplete) {
                            clearInterval(monitorInterval);
                        }
                    }, 500); // Check every 500ms
                }
            }, 5000); // Give Claude 5 seconds to start (handles auto-update)
            logDebug('PTY', 'Commands queued for execution');
            logger.debug('PtyExecutor', 'execute', 'Command written, starting heartbeat', { taskId });
            // Send heartbeat to prevent hanging
            this.startHeartbeat();
            // Add early detection of no output
            setTimeout(() => {
                if (this.output.length === 0) {
                    logDebug('PTY', 'WARNING: No output after 2s - checking PTY status');
                    if (this.pty)
                        this.pty.write('echo "PTY alive"\n');
                }
            }, 2000);
            setTimeout(() => {
                if (this.output.length === 0) {
                    logDebug('PTY', 'ERROR: No output after 5s - PTY may be stuck', {
                        taskId,
                        isComplete: this.isComplete
                    });
                    // Try to get some output
                    if (this.pty)
                        this.pty.write('echo "PTY TEST"\n');
                }
            }, 5000);
        });
    }
    idleTimer;
    resetIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        // Consider process idle after 30 seconds of no output
        this.idleTimer = setTimeout(() => {
            if (!this.isComplete) {
                logger.warn('PtyExecutor', 'checkIdleTimeout', 'Process appears idle, sending interrupt');
                logDebug('PTY', 'IDLE TIMEOUT - Process hasn\'t produced output for 30s, interrupting');
                this.interrupt();
            }
        }, 30000);
    }
    heartbeat;
    startHeartbeat() {
        logDebug('PTY', 'Starting heartbeat timer (10s intervals)');
        let heartbeatCount = 0;
        // Send periodic newline to keep PTY alive
        this.heartbeat = setInterval(() => {
            heartbeatCount++;
            if (!this.isComplete && this.pty) {
                logDebug('PTY', `Heartbeat #${heartbeatCount} - sending newline to keep PTY alive`, {
                    isComplete: this.isComplete,
                    ptyPid: this.pty.pid,
                    outputLength: this.output.length,
                    outputPreview: this.output.slice(-100)
                });
                this.pty.write('\n');
            }
            else {
                logDebug('PTY', `Heartbeat #${heartbeatCount} - skipped`, {
                    isComplete: this.isComplete,
                    hasPty: !!this.pty
                });
            }
        }, 10000);
    }
    injectCommand(command) {
        if (this.pty && !this.isComplete) {
            logger.info('PtyExecutor', 'injectCommand', `Injecting command: ${command.trim()}`);
            this.pty.write(command);
            // v4: Log intervention
            if (this.hookOrchestrator) {
                this.hookOrchestrator.triggerHooks(HookEvent.EXECUTION_INTERVENTION, {
                    execution: { taskId: 'current', status: 'running' },
                    metadata: { command }
                });
            }
        }
    }
    write(data) {
        if (this.pty && !this.isComplete) {
            // Process escape sequences
            const processedData = data
                .replace(/\\r/g, '\r') // Carriage return (Ctrl+Enter for Claude)
                .replace(/\\n/g, '\n') // Newline
                .replace(/\\t/g, '\t') // Tab
                .replace(/\\x1b/g, '\x1b') // ESC
                .replace(/\\x03/g, '\x03'); // Ctrl+C
            this.pty.write(processedData);
        }
    }
    interrupt() {
        if (this.pty && !this.isComplete) {
            this.pty.write('\x03'); // Ctrl+C
        }
    }
    kill() {
        if (this.heartbeat) {
            clearInterval(this.heartbeat);
        }
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        if (this.pty) {
            this.pty.kill();
            this.isComplete = true;
        }
    }
    getOutput() {
        return this.output;
    }
    isRunning() {
        return !this.isComplete && this.pty !== undefined;
    }
}
//# sourceMappingURL=pty-executor.js.map