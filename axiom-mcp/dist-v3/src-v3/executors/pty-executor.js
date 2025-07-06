/**
 * PTY Executor for Claude CLI
 *
 * Based on expert recommendations from GoodIdeasFromOtherModels.txt:
 * - Uses node-pty to create pseudo-terminal
 * - Implements heartbeat to prevent 30s timeout
 * - Streams output character by character
 * - Allows stdin injection for intervention
 */
import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { createMonitoringPipeline } from '../monitors/stream-interceptor.js';
export class PtyExecutor extends EventEmitter {
    options;
    ptyProcess = null;
    outputBuffer = '';
    heartbeatTimer = null;
    isRunning = false;
    streamInterceptor = null;
    constructor(options = {}) {
        super();
        this.options = options;
    }
    async execute(command, args, taskId) {
        if (this.isRunning) {
            throw new Error('Executor already running');
        }
        this.isRunning = true;
        console.error(`[PTY] Starting execution: ${command} ${args.slice(0, 2).join(' ')}...`);
        try {
            // CRITICAL: Use exact configuration from GoodIdeas
            this.ptyProcess = pty.spawn(command, args, {
                name: 'xterm-color',
                cols: this.options.cols || 120,
                rows: this.options.rows || 40,
                cwd: this.options.cwd || process.cwd(),
                env: {
                    ...process.env,
                    ...this.options.env,
                    FORCE_COLOR: '0' // Disable color to avoid ANSI escape sequences
                }
            });
            console.error(`[PTY] Process spawned successfully`);
            // Set up monitoring pipeline if enabled
            if (this.options.enableMonitoring) {
                this.streamInterceptor = createMonitoringPipeline(taskId, this.options.enableIntervention ?? true, (intervention) => {
                    // Inject intervention command into PTY
                    console.error(`[INTERVENTION] ${taskId}: ${intervention}`);
                    this.write(intervention);
                    this.emit('intervention', {
                        taskId,
                        timestamp: Date.now(),
                        type: 'intervention',
                        payload: intervention
                    });
                });
                // Subscribe to violation events
                this.streamInterceptor.onInterceptorEvent('violation', (violation) => {
                    this.emit('violation', {
                        taskId,
                        timestamp: Date.now(),
                        type: 'violation',
                        payload: violation
                    });
                });
            }
            // Notify if callback provided (for interactive controller)
            if (this.options.onExecutorCreated) {
                this.options.onExecutorCreated(this);
            }
            // Stream output character by character
            this.ptyProcess.onData((data) => {
                this.outputBuffer += data;
                // Pass through monitoring pipeline if enabled
                if (this.streamInterceptor) {
                    this.streamInterceptor.write(data);
                }
                this.emit('data', {
                    taskId,
                    timestamp: Date.now(),
                    type: 'data',
                    payload: data
                });
            });
            // Start heartbeat to prevent timeout
            this.startHeartbeat(taskId);
            // Handle process exit
            this.ptyProcess.onExit(({ exitCode, signal }) => {
                this.stopHeartbeat();
                this.isRunning = false;
                this.emit('exit', {
                    taskId,
                    timestamp: Date.now(),
                    type: 'exit',
                    payload: { exitCode, signal }
                });
            });
        }
        catch (error) {
            this.isRunning = false;
            this.emit('error', {
                taskId,
                timestamp: Date.now(),
                type: 'error',
                payload: error
            });
            throw error;
        }
    }
    /**
     * Write data to the PTY stdin
     * Used for intervention and interaction
     */
    write(data) {
        if (!this.ptyProcess || !this.isRunning) {
            throw new Error('No running process');
        }
        this.ptyProcess.write(data);
    }
    /**
     * Start heartbeat to prevent Claude CLI timeout
     * Based on expert recommendation: send zero-width char every 3 minutes
     */
    startHeartbeat(taskId) {
        const interval = this.options.heartbeatInterval || 180_000; // 3 minutes
        this.heartbeatTimer = setInterval(() => {
            if (this.ptyProcess && this.isRunning) {
                // Send zero-width character that won't affect output
                this.ptyProcess.write('\x00');
                this.emit('heartbeat', {
                    taskId,
                    timestamp: Date.now(),
                    type: 'heartbeat',
                    payload: 'Sent keepalive'
                });
            }
        }, interval);
    }
    /**
     * Stop the heartbeat timer
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    /**
     * Force kill the process
     */
    kill() {
        this.stopHeartbeat();
        if (this.ptyProcess) {
            this.ptyProcess.kill();
            this.ptyProcess = null;
        }
        this.isRunning = false;
    }
    /**
     * Get the accumulated output buffer
     */
    getOutput() {
        return this.outputBuffer;
    }
    /**
     * Get violation report if monitoring is enabled
     */
    getViolations() {
        if (this.streamInterceptor) {
            return this.streamInterceptor.getViolations();
        }
        return [];
    }
    /**
     * Force an intervention with a custom message
     */
    forceIntervention(message) {
        if (this.streamInterceptor) {
            this.streamInterceptor.forceIntervention(message);
        }
    }
    /**
     * Check if process is running
     */
    isActive() {
        return this.isRunning;
    }
}
//# sourceMappingURL=pty-executor.js.map