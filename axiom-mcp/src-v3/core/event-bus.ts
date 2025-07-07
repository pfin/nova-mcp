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

export interface LedgerEvent {
  timestamp: string;      // ISO-8601 with ms precision
  taskId: string;
  parentId?: string;
  workerId: string;
  event: EventType;
  payload: unknown;
  verification?: VerificationResult;
}

export enum EventType {
  // Task lifecycle
  TASK_START = 'task_start',
  TASK_COMPLETE = 'task_complete',
  TASK_RETRY = 'task_retry',
  TASK_FAILED = 'task_failed',
  
  // Claude interaction
  CLAUDE_DELTA = 'claude_delta',
  CLAUDE_STDOUT = 'claude_stdout',
  CLAUDE_STDERR = 'claude_stderr',
  
  // Tool usage
  TOOL_CALL = 'tool_call',
  TOOL_RETURN = 'tool_return',
  TOOL_ERROR = 'tool_error',
  
  // File system
  FILE_CREATED = 'file_created',
  FILE_MODIFIED = 'file_modified',
  FILE_DELETED = 'file_deleted',
  
  // Testing & verification
  TEST_RUN = 'test_run',
  TEST_PASS = 'test_pass',
  TEST_FAIL = 'test_fail',
  COVERAGE_REPORT = 'coverage_report',
  
  // Monitoring & intervention
  CODE_VIOLATION = 'code_violation',
  INTERVENTION = 'intervention',
  HEARTBEAT = 'heartbeat',
  
  // Verification
  VERIFICATION_START = 'verification_start',
  VERIFICATION_PASS = 'verification_pass',
  VERIFICATION_FAIL = 'verification_fail',
  
  // System events
  ERROR = 'error',
  
  // Worker events
  WORKER_SPAWNED = 'worker_spawned',
  WORKER_ERROR = 'worker_error',
  WORKER_EXIT = 'worker_exit',
  
  // Task management
  TASK_ASSIGNED = 'task_assigned',
  TASK_QUEUED = 'task_queued'
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

export class EventBus extends EventEmitter {
  private ledgerStream: fs.WriteStream;
  private eventCount: number = 0;
  private startTime: number = Date.now();
  
  constructor(private config: {
    logDir?: string;
    maxFileSize?: number;
    rotationInterval?: number;
  } = {}) {
    super();
    
    // Create log directory
    const logDir = this.config.logDir || 'logs';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Create JSONL log file
    const logFile = path.join(logDir, `axiom-events-${Date.now()}.jsonl`);
    this.ledgerStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    // Auto-persist all events
    this.on('event', (event: LedgerEvent) => {
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
  logEvent(event: Omit<LedgerEvent, 'timestamp'>): void {
    const fullEvent: LedgerEvent = {
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
  private persistEvent(event: LedgerEvent): void {
    try {
      this.ledgerStream.write(JSON.stringify(event) + '\n');
    } catch (error) {
      console.error('Failed to persist event:', error);
    }
  }
  
  /**
   * Query events by criteria
   */
  async queryEvents(criteria: {
    taskId?: string;
    event?: EventType;
    startTime?: string;
    endTime?: string;
  }): Promise<LedgerEvent[]> {
    // For now, simple implementation - in production, use indexed DB
    const events: LedgerEvent[] = [];
    
    // Read from current log file
    // TODO: Implement proper query with filters
    
    return events;
  }
  
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
  } {
    const uptime = Date.now() - this.startTime;
    return {
      totalEvents: this.eventCount,
      eventCount: this.eventCount,
      uptime,
      eventsPerSecond: this.eventCount / (uptime / 1000),
      startTime: this.startTime,
      // These would need to be tracked separately if needed
      eventCounts: undefined,
      recentEvents: undefined
    };
  }
  
  /**
   * Close the event bus and flush logs
   */
  async close(): Promise<void> {
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
  createTaskLogger(taskId: string, workerId: string = 'unknown'): TaskLogger {
    return new TaskLogger(this, taskId, workerId);
  }
}

/**
 * Task-scoped logger for convenience
 */
export class TaskLogger {
  constructor(
    private bus: EventBus,
    private taskId: string,
    private workerId: string
  ) {}
  
  log(event: EventType, payload: unknown, parentId?: string): void {
    this.bus.logEvent({
      taskId: this.taskId,
      parentId,
      workerId: this.workerId,
      event,
      payload
    });
  }
  
  start(payload: unknown = {}): void {
    this.log(EventType.TASK_START, payload);
  }
  
  complete(payload: unknown = {}): void {
    this.log(EventType.TASK_COMPLETE, payload);
  }
  
  fail(error: unknown): void {
    this.log(EventType.TASK_FAILED, { error });
  }
  
  toolCall(tool: string, params: unknown): void {
    this.log(EventType.TOOL_CALL, { tool, params });
  }
  
  verification(result: VerificationResult): void {
    this.log(
      result.passed ? EventType.VERIFICATION_PASS : EventType.VERIFICATION_FAIL,
      result
    );
  }
}