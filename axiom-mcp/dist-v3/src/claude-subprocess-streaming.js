import { spawn } from 'child_process';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { streamManager } from './stream-manager.js';
export class ClaudeCodeSubprocessStreaming {
    defaultTimeout;
    currentProcesses = new Map();
    constructor(options = {}) {
        this.defaultTimeout = options.timeout || 600000; // 10 minutes default
    }
    async execute(prompt, taskId, options = {}) {
        const startTime = Date.now();
        const timeout = options.timeout || this.defaultTimeout;
        const maxRetries = options.maxRetries || 0;
        const streamId = uuidv4();
        // Create stream channel for this task
        streamManager.createChannel(taskId);
        let retries = 0;
        let lastError = null;
        // Stream initial status
        this.streamStatus(taskId, 'starting', {
            prompt: prompt.substring(0, 100) + '...',
            parentTaskId: options.parentTaskId,
            path: options.taskPath || []
        }, options.parentTaskId, options.taskPath || []);
        while (retries <= maxRetries) {
            try {
                const result = await this.executeWithStreaming(prompt, taskId, timeout, streamId, options);
                if (result.success) {
                    // Stream completion
                    this.streamComplete(taskId, Date.now() - startTime, options.parentTaskId, options.taskPath || []);
                    return {
                        ...result,
                        duration: Date.now() - startTime,
                        retries,
                        streamId
                    };
                }
                lastError = new Error(result.error || 'Unknown error');
            }
            catch (error) {
                lastError = error;
                // Stream error
                this.streamError(taskId, lastError.message, options.parentTaskId, options.taskPath || []);
            }
            retries++;
            if (retries <= maxRetries) {
                // Stream retry status
                this.streamStatus(taskId, 'retrying', {
                    attempt: retries + 1,
                    maxRetries: maxRetries + 1,
                    lastError: lastError?.message
                }, options.parentTaskId, options.taskPath || []);
                await new Promise(resolve => setTimeout(resolve, 2000 * retries));
            }
        }
        throw lastError || new Error('Failed after retries');
    }
    async executeWithStreaming(prompt, taskId, timeout, streamId, options) {
        return new Promise((resolve, reject) => {
            const isWindows = os.platform() === 'win32';
            const claudeExecutable = isWindows ? 'claude.exe' : 'claude';
            const args = ['--no-color'];
            const env = {
                ...process.env,
                ...options.env,
                FORCE_COLOR: '0',
                NO_COLOR: '1'
            };
            const proc = spawn(claudeExecutable, args, {
                cwd: options.workingDirectory || process.cwd(),
                env,
                shell: false,
                windowsHide: true
            });
            this.currentProcesses.set(streamId, proc);
            let stdout = '';
            let stderr = '';
            let isComplete = false;
            let buffer = '';
            let lastProgress = 0;
            // Set up timeout
            const timeoutId = setTimeout(() => {
                if (!isComplete) {
                    proc.kill('SIGTERM');
                    this.streamError(taskId, 'Process timed out', options.parentTaskId, options.taskPath || []);
                    reject(new Error(`Process timed out after ${timeout}ms`));
                }
            }, timeout);
            // Handle stdout with streaming
            proc.stdout?.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                buffer += chunk;
                // Stream output chunks in real-time
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer
                for (const line of lines) {
                    if (line.trim()) {
                        // Detect progress indicators
                        const progressMatch = line.match(/(\d+)%/);
                        if (progressMatch) {
                            const percent = parseInt(progressMatch[1]);
                            if (percent > lastProgress) {
                                lastProgress = percent;
                                this.streamProgress(taskId, percent, line, options.parentTaskId, options.taskPath || []);
                            }
                        }
                        else {
                            // Stream regular output
                            this.streamOutput(taskId, line, options.parentTaskId, options.taskPath || []);
                        }
                    }
                }
            });
            // Handle stderr with streaming
            proc.stderr?.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
                // Stream errors immediately
                const lines = chunk.split('\n').filter((line) => line.trim());
                for (const line of lines) {
                    if (!line.includes('Warning:') && !line.includes('Info:')) {
                        this.streamError(taskId, line, options.parentTaskId, options.taskPath || []);
                    }
                }
            });
            // Send the prompt after process starts
            proc.stdin?.write(prompt + '\n');
            proc.stdin?.end();
            // Handle process completion
            proc.on('close', (code) => {
                isComplete = true;
                clearTimeout(timeoutId);
                this.currentProcesses.delete(streamId);
                // Flush any remaining buffer
                if (buffer.trim()) {
                    this.streamOutput(taskId, buffer, options.parentTaskId, options.taskPath || []);
                }
                if (code === 0) {
                    resolve({
                        success: true,
                        output: stdout,
                        error: stderr,
                        duration: 0,
                        retries: 0,
                        streamId
                    });
                }
                else {
                    resolve({
                        success: false,
                        output: stdout,
                        error: stderr || `Process exited with code ${code}`,
                        duration: 0,
                        retries: 0,
                        streamId
                    });
                }
            });
            proc.on('error', (error) => {
                isComplete = true;
                clearTimeout(timeoutId);
                this.currentProcesses.delete(streamId);
                this.streamError(taskId, error.message, options.parentTaskId, options.taskPath || []);
                reject(error);
            });
        });
    }
    // Stream helper methods that propagate to parent
    streamStatus(taskId, status, data, parentTaskId, path = []) {
        const update = {
            id: uuidv4(),
            taskId,
            parentTaskId,
            level: path.length,
            type: 'status',
            timestamp: new Date(),
            data: { status, ...data },
            source: `Task ${taskId.substring(0, 8)}`,
            path
        };
        streamManager.streamUpdate(update);
    }
    streamProgress(taskId, percent, message, parentTaskId, path = []) {
        const update = {
            id: uuidv4(),
            taskId,
            parentTaskId,
            level: path.length,
            type: 'progress',
            timestamp: new Date(),
            data: { percent, message },
            source: `Task ${taskId.substring(0, 8)}`,
            path
        };
        streamManager.streamUpdate(update);
    }
    streamOutput(taskId, output, parentTaskId, path = []) {
        // Truncate long output for preview
        const preview = output.length > 200 ? output.substring(0, 200) + '...' : output;
        const update = {
            id: uuidv4(),
            taskId,
            parentTaskId,
            level: path.length,
            type: 'output',
            timestamp: new Date(),
            data: { preview, full: output },
            source: `Task ${taskId.substring(0, 8)}`,
            path
        };
        streamManager.streamUpdate(update);
    }
    streamError(taskId, error, parentTaskId, path = []) {
        const update = {
            id: uuidv4(),
            taskId,
            parentTaskId,
            level: path.length,
            type: 'error',
            timestamp: new Date(),
            data: { error },
            source: `Task ${taskId.substring(0, 8)}`,
            path
        };
        streamManager.streamUpdate(update);
    }
    streamComplete(taskId, duration, parentTaskId, path = []) {
        const update = {
            id: uuidv4(),
            taskId,
            parentTaskId,
            level: path.length,
            type: 'complete',
            timestamp: new Date(),
            data: { duration },
            source: `Task ${taskId.substring(0, 8)}`,
            path
        };
        streamManager.streamUpdate(update);
    }
    // Kill all active processes
    async killAll() {
        for (const [id, proc] of this.currentProcesses) {
            proc.kill('SIGTERM');
            this.currentProcesses.delete(id);
        }
    }
    // Get active process count
    getActiveCount() {
        return this.currentProcesses.size;
    }
}
//# sourceMappingURL=claude-subprocess-streaming.js.map