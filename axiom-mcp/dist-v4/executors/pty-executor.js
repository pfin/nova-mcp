import { spawn } from 'node-pty';
import { EventEmitter } from 'events';
import * as os from 'os';
import { HookEvent } from '../core/hook-orchestrator.js';
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
        return new Promise((resolve, reject) => {
            const shell = this.options.shell || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');
            const cwd = this.options.cwd || process.cwd();
            // Create PTY instance
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
            // Handle data with hook integration
            this.pty.onData(async (data) => {
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
            this.pty.onExit((exitCode) => {
                this.isComplete = true;
                if (exitCode.exitCode === 0) {
                    resolve(this.output);
                }
                else {
                    reject(new Error(`Process exited with code ${exitCode.exitCode}`));
                }
            });
            // Write the Claude executable path
            const claudePath = process.env.CLAUDE_CODE_PATH || 'claude';
            // v4: Notify hooks of execution start
            if (this.hookOrchestrator) {
                this.hookOrchestrator.triggerHooks(HookEvent.EXECUTION_STARTED, {
                    execution: { taskId, status: 'running' },
                    request: { tool: 'pty_executor', args: { prompt, systemPrompt } }
                });
            }
            // Execute Claude with the prompt
            this.pty.write(`${claudePath} --text "${prompt.replace(/"/g, '\\"')}"\n`);
            // Send heartbeat to prevent hanging
            this.startHeartbeat();
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
                console.error('[PtyExecutor] Process appears idle, sending interrupt');
                this.interrupt();
            }
        }, 30000);
    }
    heartbeat;
    startHeartbeat() {
        // Send periodic newline to keep PTY alive
        this.heartbeat = setInterval(() => {
            if (!this.isComplete && this.pty) {
                this.pty.write('\n');
            }
        }, 10000);
    }
    injectCommand(command) {
        if (this.pty && !this.isComplete) {
            console.error(`[PtyExecutor] Injecting command: ${command.trim()}`);
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
            this.pty.write(data);
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