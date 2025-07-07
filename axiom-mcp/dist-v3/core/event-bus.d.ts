/**
 * Event Bus with JSONL Persistence
 *
 * Based on expert recommendations:
 * - Append-only JSONL format for easy grep and replay
 * - Millisecond precision timestamps
 * - Structured event format for all operations
 */
import { EventEmitter } from 'events';
export interface LedgerEvent {
    timestamp: string;
    taskId: string;
    parentId?: string;
    workerId: string;
    event: EventType;
    payload: unknown;
    verification?: VerificationResult;
}
export declare enum EventType {
    TASK_START = "task_start",
    TASK_COMPLETE = "task_complete",
    TASK_RETRY = "task_retry",
    TASK_FAILED = "task_failed",
    CLAUDE_DELTA = "claude_delta",
    CLAUDE_STDOUT = "claude_stdout",
    CLAUDE_STDERR = "claude_stderr",
    TOOL_CALL = "tool_call",
    TOOL_RETURN = "tool_return",
    TOOL_ERROR = "tool_error",
    FILE_CREATED = "file_created",
    FILE_MODIFIED = "file_modified",
    FILE_DELETED = "file_deleted",
    TEST_RUN = "test_run",
    TEST_PASS = "test_pass",
    TEST_FAIL = "test_fail",
    COVERAGE_REPORT = "coverage_report",
    CODE_VIOLATION = "code_violation",
    INTERVENTION = "intervention",
    HEARTBEAT = "heartbeat",
    VERIFICATION_START = "verification_start",
    VERIFICATION_PASS = "verification_pass",
    VERIFICATION_FAIL = "verification_fail",
    ERROR = "error",
    WORKER_SPAWNED = "worker_spawned",
    WORKER_ERROR = "worker_error",
    WORKER_EXIT = "worker_exit",
    TASK_ASSIGNED = "task_assigned",
    TASK_QUEUED = "task_queued"
}
export interface VerificationResult {
    passed: boolean;
    checks: {
        filesCreated: boolean;
        testsPass: boolean;
        coverageMet: boolean;
        noVulnerabilities: boolean;
        actuallyRuns: boolean;
    };
    details?: string;
}
export declare class EventBus extends EventEmitter {
    private config;
    private ledgerStream;
    private eventCount;
    private startTime;
    constructor(config?: {
        logDir?: string;
        maxFileSize?: number;
        rotationInterval?: number;
    });
    /**
     * Log an event to the bus and ledger
     */
    logEvent(event: Omit<LedgerEvent, 'timestamp'>): void;
    /**
     * Persist event to JSONL file
     */
    private persistEvent;
    /**
     * Query events by criteria
     */
    queryEvents(criteria: {
        taskId?: string;
        event?: EventType;
        startTime?: string;
        endTime?: string;
    }): Promise<LedgerEvent[]>;
    /**
     * Get event statistics
     */
    getStats(): {
        totalEvents: number;
        eventCount: number;
        uptime: number;
        eventsPerSecond: number;
        startTime: number;
        eventCounts?: Record<string, number>;
        recentEvents?: LedgerEvent[];
    };
    /**
     * Close the event bus and flush logs
     */
    close(): Promise<void>;
    /**
     * Create a scoped logger for a specific task
     */
    createTaskLogger(taskId: string, workerId?: string): TaskLogger;
}
/**
 * Task-scoped logger for convenience
 */
export declare class TaskLogger {
    private bus;
    private taskId;
    private workerId;
    constructor(bus: EventBus, taskId: string, workerId: string);
    log(event: EventType, payload: unknown, parentId?: string): void;
    start(payload?: unknown): void;
    complete(payload?: unknown): void;
    fail(error: unknown): void;
    toolCall(tool: string, params: unknown): void;
    verification(result: VerificationResult): void;
}
//# sourceMappingURL=event-bus.d.ts.map