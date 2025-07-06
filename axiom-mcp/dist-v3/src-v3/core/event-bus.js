/**
 * Event Bus with JSONL Persistence
 *
 * Based on expert recommendations:
 * - Append-only JSONL format for easy grep and replay
 * - Millisecond precision timestamps
 * - Structured event format for all operations
 */
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
export var EventType;
(function (EventType) {
    // Task lifecycle
    EventType["TASK_START"] = "task_start";
    EventType["TASK_COMPLETE"] = "task_complete";
    EventType["TASK_RETRY"] = "task_retry";
    EventType["TASK_FAILED"] = "task_failed";
    // Claude interaction
    EventType["CLAUDE_DELTA"] = "claude_delta";
    EventType["CLAUDE_STDOUT"] = "claude_stdout";
    EventType["CLAUDE_STDERR"] = "claude_stderr";
    // Tool usage
    EventType["TOOL_CALL"] = "tool_call";
    EventType["TOOL_RETURN"] = "tool_return";
    EventType["TOOL_ERROR"] = "tool_error";
    // File system
    EventType["FILE_CREATED"] = "file_created";
    EventType["FILE_MODIFIED"] = "file_modified";
    EventType["FILE_DELETED"] = "file_deleted";
    // Testing & verification
    EventType["TEST_RUN"] = "test_run";
    EventType["TEST_PASS"] = "test_pass";
    EventType["TEST_FAIL"] = "test_fail";
    EventType["COVERAGE_REPORT"] = "coverage_report";
    // Monitoring & intervention
    EventType["CODE_VIOLATION"] = "code_violation";
    EventType["INTERVENTION"] = "intervention";
    EventType["HEARTBEAT"] = "heartbeat";
    // Verification
    EventType["VERIFICATION_START"] = "verification_start";
    EventType["VERIFICATION_PASS"] = "verification_pass";
    EventType["VERIFICATION_FAIL"] = "verification_fail";
    // System events
    EventType["ERROR"] = "error";
    // Worker events
    EventType["WORKER_SPAWNED"] = "worker_spawned";
    EventType["WORKER_ERROR"] = "worker_error";
    EventType["WORKER_EXIT"] = "worker_exit";
    // Task management
    EventType["TASK_ASSIGNED"] = "task_assigned";
    EventType["TASK_QUEUED"] = "task_queued";
})(EventType || (EventType = {}));
export class EventBus extends EventEmitter {
    config;
    ledgerStream;
    eventCount = 0;
    startTime = Date.now();
    constructor(config = {}) {
        super();
        this.config = config;
        // Create log directory
        const logDir = this.config.logDir || 'logs';
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        // Create JSONL log file
        const logFile = path.join(logDir, `axiom-events-${Date.now()}.jsonl`);
        this.ledgerStream = fs.createWriteStream(logFile, { flags: 'a' });
        // Auto-persist all events
        this.on('event', (event) => {
            this.persistEvent(event);
        });
        // Log startup event
        this.logEvent({
            taskId: 'system',
            workerId: 'main',
            event: EventType.TASK_START,
            payload: { message: 'Event bus initialized' }
        });
    }
    /**
     * Log an event to the bus and ledger
     */
    logEvent(event) {
        const fullEvent = {
            ...event,
            timestamp: new Date().toISOString() // ISO-8601 with ms precision
        };
        this.eventCount++;
        this.emit('event', fullEvent);
        // Also emit specific event type for targeted listeners
        this.emit(event.event, fullEvent);
    }
    /**
     * Persist event to JSONL file
     */
    persistEvent(event) {
        try {
            this.ledgerStream.write(JSON.stringify(event) + '\n');
        }
        catch (error) {
            console.error('Failed to persist event:', error);
        }
    }
    /**
     * Query events by criteria
     */
    async queryEvents(criteria) {
        // For now, simple implementation - in production, use indexed DB
        const events = [];
        // Read from current log file
        // TODO: Implement proper query with filters
        return events;
    }
    /**
     * Get event statistics
     */
    getStats() {
        const uptime = Date.now() - this.startTime;
        return {
            eventCount: this.eventCount,
            uptime,
            eventsPerSecond: this.eventCount / (uptime / 1000)
        };
    }
    /**
     * Close the event bus and flush logs
     */
    async close() {
        return new Promise((resolve) => {
            this.logEvent({
                taskId: 'system',
                workerId: 'main',
                event: EventType.TASK_COMPLETE,
                payload: {
                    message: 'Event bus shutting down',
                    stats: this.getStats()
                }
            });
            this.ledgerStream.end(() => {
                this.removeAllListeners();
                resolve();
            });
        });
    }
    /**
     * Create a scoped logger for a specific task
     */
    createTaskLogger(taskId, workerId = 'unknown') {
        return new TaskLogger(this, taskId, workerId);
    }
}
/**
 * Task-scoped logger for convenience
 */
export class TaskLogger {
    bus;
    taskId;
    workerId;
    constructor(bus, taskId, workerId) {
        this.bus = bus;
        this.taskId = taskId;
        this.workerId = workerId;
    }
    log(event, payload, parentId) {
        this.bus.logEvent({
            taskId: this.taskId,
            parentId,
            workerId: this.workerId,
            event,
            payload
        });
    }
    start(payload = {}) {
        this.log(EventType.TASK_START, payload);
    }
    complete(payload = {}) {
        this.log(EventType.TASK_COMPLETE, payload);
    }
    fail(error) {
        this.log(EventType.TASK_FAILED, { error });
    }
    toolCall(tool, params) {
        this.log(EventType.TOOL_CALL, { tool, params });
    }
    verification(result) {
        this.log(result.passed ? EventType.VERIFICATION_PASS : EventType.VERIFICATION_FAIL, result);
    }
}
//# sourceMappingURL=event-bus.js.map