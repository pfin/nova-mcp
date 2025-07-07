import * as fs from 'fs/promises';
import * as path from 'path';
export class DebugLogger {
    static instance;
    logFile;
    buffer = [];
    flushTimer;
    constructor() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFile = path.join('/home/peter/nova-mcp/axiom-mcp/logs-v4', `debug-${timestamp}.log`);
        this.startFlushTimer();
    }
    static getInstance() {
        if (!DebugLogger.instance) {
            DebugLogger.instance = new DebugLogger();
        }
        return DebugLogger.instance;
    }
    async log(component, message, data) {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [${component}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
        this.buffer.push(logLine);
        // Also write to stderr for immediate visibility
        process.stderr.write(logLine);
        // Flush if buffer is getting large
        if (this.buffer.length > 100) {
            await this.flush();
        }
    }
    startFlushTimer() {
        this.flushTimer = setInterval(() => {
            this.flush().catch(err => {
                process.stderr.write(`Failed to flush debug log: ${err}\n`);
            });
        }, 1000); // Flush every second
    }
    async flush() {
        if (this.buffer.length === 0)
            return;
        const content = this.buffer.join('');
        this.buffer = [];
        try {
            await fs.appendFile(this.logFile, content);
        }
        catch (err) {
            process.stderr.write(`Failed to write to debug log: ${err}\n`);
        }
    }
    getLogFile() {
        return this.logFile;
    }
    async shutdown() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        await this.flush();
    }
}
// Export singleton instance
export const debugLog = DebugLogger.getInstance();
//# sourceMappingURL=debug-logger.js.map