import * as fs from 'fs/promises';
import * as path from 'path';
export class EventBus {
    logStream;
    logPath;
    hookOrchestrator;
    constructor(logsDir = 'logs-v4') {
        this.logPath = path.join(logsDir, `axiom-events-${Date.now()}.jsonl`);
    }
    // v4 addition: Set hook orchestrator
    setHookOrchestrator(orchestrator) {
        this.hookOrchestrator = orchestrator;
    }
    async initialize() {
        // Ensure logs directory exists
        await fs.mkdir(path.dirname(this.logPath), { recursive: true });
        // Open log file for appending
        this.logStream = await fs.open(this.logPath, 'a');
        // Only log in debug mode
        if (process.env.AXIOM_LOG_LEVEL === 'DEBUG' || process.env.AXIOM_LOG_LEVEL === 'TRACE') {
            console.error(`[EventBus] Logging to ${this.logPath}`);
        }
    }
    async logEvent(entry) {
        const line = JSON.stringify(entry) + '\n';
        if (this.logStream) {
            await this.logStream.write(line);
        }
        // v4: Trigger hooks for event logging
        if (this.hookOrchestrator) {
            await this.hookOrchestrator.triggerHooks('EVENT_LOGGED', { entry });
        }
        // Also log critical events to stderr
        if (entry.event === 'error' || entry.event === 'intervention') {
            console.error(`[EventBus] ${entry.event}:`, entry.payload);
        }
    }
    async getRecentEvents(limit = 100) {
        try {
            const content = await fs.readFile(this.logPath, 'utf-8');
            const lines = content.trim().split('\n').filter(l => l);
            const events = lines.slice(-limit).map(line => JSON.parse(line));
            return events;
        }
        catch (error) {
            return [];
        }
    }
    async searchEvents(filter) {
        try {
            const content = await fs.readFile(this.logPath, 'utf-8');
            const lines = content.trim().split('\n').filter(l => l);
            return lines
                .map(line => JSON.parse(line))
                .filter(entry => {
                if (filter.taskId && entry.taskId !== filter.taskId)
                    return false;
                if (filter.event && entry.event !== filter.event)
                    return false;
                if (filter.startTime && entry.timestamp < filter.startTime)
                    return false;
                if (filter.endTime && entry.timestamp > filter.endTime)
                    return false;
                return true;
            });
        }
        catch (error) {
            return [];
        }
    }
    async getEventStats() {
        try {
            const content = await fs.readFile(this.logPath, 'utf-8');
            const lines = content.trim().split('\n').filter(l => l);
            const stats = {};
            for (const line of lines) {
                const entry = JSON.parse(line);
                stats[entry.event] = (stats[entry.event] || 0) + 1;
            }
            return stats;
        }
        catch (error) {
            return {};
        }
    }
    async close() {
        if (this.logStream) {
            await this.logStream.close();
        }
    }
}
//# sourceMappingURL=event-bus.js.map