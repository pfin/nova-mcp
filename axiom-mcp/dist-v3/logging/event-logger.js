/**
 * Event Logger for Axiom MCP v3
 * Logs all events to JSONL files for analysis
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export class EventLogger {
    logFile;
    stream = null;
    constructor() {
        // Create logs directory
        const logsDir = path.join(__dirname, '../../logs-v3');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        // Create log file with timestamp
        this.logFile = path.join(logsDir, `axiom-events-${Date.now()}.jsonl`);
        this.stream = fs.createWriteStream(this.logFile, { flags: 'a' });
        console.error(`[LOGGER] Logging events to: ${this.logFile}`);
    }
    logEvent(event) {
        if (!this.stream)
            return;
        // Add microsecond precision
        const enrichedEvent = {
            ...event,
            timestamp: Date.now(),
            timestampMicro: process.hrtime.bigint().toString(),
        };
        this.stream.write(JSON.stringify(enrichedEvent) + '\n');
    }
    close() {
        if (this.stream) {
            this.stream.end();
            this.stream = null;
        }
    }
}
//# sourceMappingURL=event-logger.js.map