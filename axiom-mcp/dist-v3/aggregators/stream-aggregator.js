import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
export class StreamAggregator extends EventEmitter {
    streamParser;
    ruleVerifier;
    conversationDB;
    activeStreams = new Map();
    outputStream;
    colorMap = new Map();
    colors = ['cyan', 'green', 'yellow', 'blue', 'magenta'];
    colorIndex = 0;
    constructor(streamParser, ruleVerifier, conversationDB, outputStream = process.stderr) {
        super();
        this.streamParser = streamParser;
        this.ruleVerifier = ruleVerifier;
        this.conversationDB = conversationDB;
        this.outputStream = outputStream;
    }
    getTaskColor(taskId) {
        if (!this.colorMap.has(taskId)) {
            this.colorMap.set(taskId, this.colors[this.colorIndex % this.colors.length]);
            this.colorIndex++;
        }
        return this.colorMap.get(taskId);
    }
    attachChild(taskId, executor) {
        const shortId = taskId.slice(0, 8);
        const prefix = `[${shortId}]`;
        const metadata = {
            taskId,
            shortId,
            executor,
            startTime: Date.now(),
            lineBuffer: '',
            byteCount: 0,
            lineCount: 0,
            lastActivity: Date.now(),
            interventionCount: 0
        };
        this.activeStreams.set(taskId, metadata);
        this.outputLine(prefix, 'Starting execution...', 'cyan');
        if ('pty' in executor) {
            this.attachPtyExecutor(taskId, executor, prefix);
        }
        else {
            this.attachSdkExecutor(taskId, executor, prefix);
        }
    }
    attachPtyExecutor(taskId, executor, prefix) {
        const metadata = this.activeStreams.get(taskId);
        executor.on('data', async (event) => {
            if (event.type === 'data') {
                metadata.lastActivity = Date.now();
                metadata.byteCount += event.payload.length;
                // Buffer lines for clean output
                metadata.lineBuffer += event.payload;
                const lines = metadata.lineBuffer.split('\n');
                metadata.lineBuffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim()) {
                        metadata.lineCount++;
                        this.outputLine(prefix, line);
                        // Check for interventions
                        if (line.includes('[INTERVENTION]')) {
                            metadata.interventionCount++;
                            this.emit('intervention', { taskId, line });
                        }
                    }
                }
                // Still parse and store in DB
                if (this.streamParser) {
                    const events = this.streamParser.parse(event.payload);
                    if (events.length > 0 && this.conversationDB) {
                        await this.storeEvents(taskId, events);
                    }
                }
                // Emit periodic stats
                if (metadata.lineCount % 10 === 0) {
                    this.emit('stats', {
                        taskId,
                        lines: metadata.lineCount,
                        bytes: metadata.byteCount,
                        interventions: metadata.interventionCount
                    });
                }
            }
        });
        executor.on('exit', () => this.handleChildExit(taskId));
        executor.on('error', (event) => {
            this.outputLine(prefix, `ERROR: ${event.payload}`, 'red');
        });
    }
    attachSdkExecutor(taskId, executor, prefix) {
        const metadata = this.activeStreams.get(taskId);
        executor.on('delta', (event) => {
            metadata.lastActivity = Date.now();
            metadata.lineCount++;
            if (event.payload?.messageType === 'assistant') {
                this.outputLine(prefix, '[SDK] Assistant message received', 'green');
                // Parse assistant message content for better display
                if (event.payload.content) {
                    const content = JSON.stringify(event.payload.content);
                    this.outputLine(prefix, content.slice(0, 200) + '...', 'gray');
                }
            }
            else {
                this.outputLine(prefix, `[SDK] ${event.payload?.messageType || 'unknown'}`, 'gray');
            }
            // Emit stats periodically
            if (metadata.lineCount % 5 === 0) {
                this.emit('stats', {
                    taskId,
                    lines: metadata.lineCount,
                    bytes: metadata.byteCount,
                    interventions: metadata.interventionCount
                });
            }
        });
        executor.on('complete', (event) => {
            this.outputLine(prefix, `[SDK] Complete. Messages: ${event.payload?.messageCount}`, 'green');
            this.handleChildExit(taskId);
        });
        executor.on('error', (event) => {
            this.outputLine(prefix, `[SDK] ERROR: ${event.payload}`, 'red');
            this.handleChildExit(taskId);
        });
    }
    async storeEvents(taskId, events) {
        if (!this.conversationDB)
            return;
        try {
            for (const event of events) {
                await this.conversationDB.createStream({
                    id: uuidv4(),
                    conversation_id: taskId,
                    chunk: JSON.stringify(event),
                    parsed_data: event,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        catch (err) {
            console.error(`[StreamAggregator] Failed to store events:`, err);
        }
    }
    handleChildExit(taskId) {
        const metadata = this.activeStreams.get(taskId);
        if (!metadata)
            return;
        const prefix = `[${metadata.shortId}]`;
        // Flush any remaining buffer
        if (metadata.lineBuffer) {
            this.outputLine(prefix, metadata.lineBuffer);
        }
        const duration = Date.now() - metadata.startTime;
        this.outputLine(prefix, `Execution completed in ${(duration / 1000).toFixed(1)}s`, 'cyan');
        this.emit('child-complete', {
            taskId,
            duration,
            lines: metadata.lineCount,
            interventions: metadata.interventionCount
        });
        this.activeStreams.delete(taskId);
        this.colorMap.delete(taskId);
    }
    outputLine(prefix, line, color) {
        const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
        let output = prefix;
        // Add color if terminal supports it
        if (color && this.outputStream === process.stderr && process.stderr.isTTY) {
            const colorCode = this.getAnsiColor(color);
            output = `\x1b[${colorCode}m${prefix}\x1b[0m`;
        }
        this.outputStream.write(`${output} ${line}\n`);
        // Emit for other consumers
        this.emit('line', { prefix, line, timestamp });
    }
    getAnsiColor(color) {
        const colors = {
            'red': '31',
            'green': '32',
            'yellow': '33',
            'blue': '34',
            'magenta': '35',
            'cyan': '36',
            'gray': '90'
        };
        return colors[color] || '37';
    }
    getActiveCount() {
        return this.activeStreams.size;
    }
    getStats() {
        const streams = Array.from(this.activeStreams.values()).map(s => ({
            taskId: s.taskId,
            uptime: Date.now() - s.startTime,
            lines: s.lineCount,
            bytes: s.byteCount,
            interventions: s.interventionCount
        }));
        return {
            activeCount: this.activeStreams.size,
            totalLines: streams.reduce((sum, s) => sum + s.lines, 0),
            totalBytes: streams.reduce((sum, s) => sum + s.bytes, 0),
            totalInterventions: streams.reduce((sum, s) => sum + s.interventions, 0),
            streams
        };
    }
}
//# sourceMappingURL=stream-aggregator.js.map