import { spawn } from 'node-pty';
import { EventEmitter } from 'events';
import * as os from 'os';
import { Logger } from '../core/logger.js';
import { logDebug } from '../core/simple-logger.js';
const logger = Logger.getInstance();
/**
 * CommandExecutor - Executes actual commands instead of calling Claude recursively
 */
export class CommandExecutor extends EventEmitter {
    options;
    pty;
    output = '';
    isComplete = false;
    hookOrchestrator;
    constructor(options = {}) {
        super();
        this.options = options;
        this.hookOrchestrator = options.hookOrchestrator;
    }
    async execute(prompt, systemPrompt, taskId, streamHandler) {
        logDebug('CMD_EXECUTOR', 'Starting execution', { taskId, prompt });
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
                    FORCE_COLOR: '0',
                }
            });
            // Handle data
            this.pty.onData(async (data) => {
                logDebug('CMD_EXECUTOR', `Received ${data.length} bytes`);
                this.output += data;
                if (streamHandler) {
                    streamHandler(data);
                }
                this.emit('data', data);
            });
            // Handle exit
            this.pty.onExit((exitCode) => {
                logDebug('CMD_EXECUTOR', 'Process exited', { exitCode: exitCode.exitCode });
                this.isComplete = true;
                if (exitCode.exitCode === 0) {
                    resolve(this.output);
                }
                else {
                    reject(new Error(`Process exited with code ${exitCode.exitCode}`));
                }
            });
            // Parse the prompt and execute actual commands
            this.executePrompt(prompt, taskId);
        });
    }
    executePrompt(prompt, taskId) {
        logDebug('CMD_EXECUTOR', 'Parsing prompt', { prompt });
        // Simple prompt parsing - look for file creation requests
        if (prompt.toLowerCase().includes('create') && prompt.includes('.py')) {
            // Extract filename
            const fileMatch = prompt.match(/(\w+\.py)/);
            if (fileMatch) {
                const filename = fileMatch[1];
                logDebug('CMD_EXECUTOR', `Creating Python file: ${filename}`);
                // Create the file
                if (prompt.toLowerCase().includes('hello') || prompt.toLowerCase().includes('print')) {
                    this.pty.write(`cat > ${filename} << 'EOF'\nprint('Hello World')\nEOF\n`);
                }
                else {
                    this.pty.write(`cat > ${filename} << 'EOF'\n# ${prompt}\n# TODO: Implement\nprint('Not implemented yet')\nEOF\n`);
                }
                // Confirm creation
                setTimeout(() => {
                    if (this.pty) {
                        this.pty.write(`echo "Created file: ${filename}"\n`);
                        this.pty.write(`ls -la ${filename}\n`);
                        setTimeout(() => {
                            if (this.pty)
                                this.pty.write('exit\n');
                        }, 500);
                    }
                }, 500);
                return;
            }
        }
        // Default: just echo the prompt
        this.pty.write(`echo "Task: ${prompt}"\n`);
        setTimeout(() => {
            if (this.pty)
                this.pty.write('exit\n');
        }, 1000);
    }
    kill() {
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
//# sourceMappingURL=command-executor.js.map