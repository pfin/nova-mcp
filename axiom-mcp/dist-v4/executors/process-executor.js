/**
 * Process-based Executor - Inspired by DesktopCommander's approach
 * Uses child_process.spawn() directly with PID tracking
 */
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { Logger } from '../core/logger.js';
import { logDebug } from '../core/simple-logger.js';
export class ProcessExecutor extends EventEmitter {
    sessions = new Map();
    hookOrchestrator;
    logger;
    taskToPid = new Map();
    constructor(options = {}) {
        super();
        this.hookOrchestrator = options.hookOrchestrator;
        this.logger = Logger.getInstance();
    }
    async execute(prompt, systemPrompt, taskId, streamHandler) {
        logDebug('PROCESS', `Starting execution for task ${taskId}`, { prompt });
        // Spawn Claude in interactive mode
        const childProcess = spawn('claude', [], {
            shell: false,
            env: { ...process.env, TERM: 'xterm-256color' }
        });
        if (!childProcess.pid) {
            throw new Error('Failed to spawn process');
        }
        const session = {
            pid: childProcess.pid,
            process: childProcess,
            output: '',
            isReady: false,
            command: prompt,
            created: new Date()
        };
        this.sessions.set(childProcess.pid, session);
        this.taskToPid.set(taskId, childProcess.pid);
        logDebug('PROCESS', `Process spawned with PID ${childProcess.pid}`);
        // Handle stdout
        childProcess.stdout?.on('data', (data) => {
            const text = data.toString();
            session.output += text;
            logDebug('PROCESS', `[PID ${childProcess.pid}] stdout:`, text);
            // Stream to handler
            if (streamHandler)
                streamHandler(text);
            this.emit('data', text);
            // Detect readiness (looking for Claude's interactive prompt)
            if (!session.isReady && (text.toLowerCase().includes('how can i help') ||
                text.toLowerCase().includes('would you like') ||
                text.includes('```') ||
                text.includes('To ') // Common Claude response starter
            )) {
                session.isReady = true;
                logDebug('PROCESS', `Process ${childProcess.pid} is ready for input`);
                // Send the initial prompt
                if (childProcess.stdin && !childProcess.stdin.destroyed) {
                    childProcess.stdin.write(prompt + '\n');
                    logDebug('PROCESS', `Sent initial prompt to Claude`);
                }
            }
        });
        // Handle stderr
        childProcess.stderr?.on('data', (data) => {
            const text = data.toString();
            session.output += text;
            logDebug('PROCESS', `[PID ${childProcess.pid}] stderr:`, text);
            if (streamHandler)
                streamHandler(text);
            this.emit('data', text);
        });
        // Handle exit
        childProcess.on('exit', (code) => {
            logDebug('PROCESS', `Process ${childProcess.pid} exited with code ${code}`);
            this.sessions.delete(childProcess.pid);
            this.taskToPid.delete(taskId);
        });
        // In verbose mode, return immediately with task info
        // The process continues running and can receive interventions
        return `Task ${taskId} started with PID ${childProcess.pid}. Use axiom_send to intervene.`;
    }
    /**
     * Send input to a running process
     */
    write(message) {
        // Find the most recent process or use taskId mapping
        const pids = Array.from(this.sessions.keys());
        if (pids.length === 0) {
            this.logger.warn('ProcessExecutor', 'write', 'No active processes');
            return;
        }
        const pid = pids[pids.length - 1];
        const session = this.sessions.get(pid);
        if (!session) {
            this.logger.warn('ProcessExecutor', 'write', 'Session not found');
            return;
        }
        logDebug('PROCESS', `Sending input to PID ${pid}:`, message);
        if (session.process.stdin && !session.process.stdin.destroyed) {
            session.process.stdin.write(message + '\n');
            this.emit('data', `[INTERVENTION]: ${message}\n`);
            this.logger.info('ProcessExecutor', 'write', 'Sent intervention', { pid, message });
        }
    }
    /**
     * Send input to a specific task
     */
    writeToTask(taskId, message) {
        const pid = this.taskToPid.get(taskId);
        if (!pid) {
            this.logger.warn('ProcessExecutor', 'writeToTask', 'Task not found', { taskId });
            return;
        }
        const session = this.sessions.get(pid);
        if (!session) {
            this.logger.warn('ProcessExecutor', 'writeToTask', 'Session not found', { pid });
            return;
        }
        logDebug('PROCESS', `Sending input to task ${taskId} (PID ${pid}):`, message);
        if (session.process.stdin && !session.process.stdin.destroyed) {
            session.process.stdin.write(message + '\n');
            this.emit('data', `[INTERVENTION]: ${message}\n`);
        }
    }
    interrupt() {
        const pids = Array.from(this.sessions.keys());
        if (pids.length > 0) {
            const pid = pids[pids.length - 1];
            const session = this.sessions.get(pid);
            if (session) {
                session.process.kill('SIGINT');
                this.emit('data', '[INTERRUPTED]\n');
            }
        }
    }
    kill() {
        for (const [pid, session] of this.sessions) {
            session.process.kill('SIGTERM');
        }
        this.sessions.clear();
        this.taskToPid.clear();
    }
    getActiveSessionCount() {
        return this.sessions.size;
    }
}
//# sourceMappingURL=process-executor.js.map