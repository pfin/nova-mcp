/**
 * Event Streaming Protocol Tests
 * Based on expert specifications from GoodIdeasFromChatGPTo3.txt
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventBus, EventType, LedgerEvent } from '../core/event-bus.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Event Streaming Protocol - Expert Specification Tests', () => {
  let eventBus: EventBus;
  const testLogDir = './test-logs-streaming';
  
  beforeEach(() => {
    // Clean test directory
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true });
    }
    
    eventBus = new EventBus({ logDir: testLogDir });
  });
  
  afterEach(async () => {
    await eventBus.close();
  });
  
  describe('Expert Spec: Unified Event Ledger (Lines 203-217)', () => {
    it('should create events matching LedgerEntry interface', () => {
      const event: Omit<LedgerEvent, 'timestamp'> = {
        taskId: 'task-abc-123',
        parentId: 'task-xyz-987',
        workerId: 'Claude-Worker-1',
        event: EventType.TOOL_CALL,
        payload: { tool: 'file_write', params: {} }
      };
      
      eventBus.logEvent(event);
      
      // Event should be emitted
      let capturedEvent: LedgerEvent | null = null;
      eventBus.once('event', (e) => { capturedEvent = e; });
      eventBus.logEvent(event);
      
      expect(capturedEvent).toBeDefined();
      expect(capturedEvent!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(capturedEvent!.taskId).toBe('task-abc-123');
      expect(capturedEvent!.parentId).toBe('task-xyz-987');
    });
  });
  
  describe('Expert Spec: JSONL Persistence (Line 204)', () => {
    it('should persist events to JSONL file with millisecond precision', async () => {
      // Log multiple events
      eventBus.logEvent({
        taskId: 'test-1',
        workerId: 'worker-1',
        event: EventType.TASK_START,
        payload: { message: 'Starting' }
      });
      
      eventBus.logEvent({
        taskId: 'test-1',
        workerId: 'worker-1',
        event: EventType.TASK_COMPLETE,
        payload: { message: 'Done' }
      });
      
      // Close to flush
      await eventBus.close();
      
      // Read JSONL file
      const files = fs.readdirSync(testLogDir);
      const jsonlFile = files.find(f => f.endsWith('.jsonl'));
      expect(jsonlFile).toBeDefined();
      
      const content = fs.readFileSync(path.join(testLogDir, jsonlFile!), 'utf-8');
      const lines = content.trim().split('\n');
      
      expect(lines.length).toBeGreaterThanOrEqual(3); // System start + 2 events
      
      // Parse and verify each line
      lines.forEach(line => {
        const event = JSON.parse(line);
        expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(event.taskId).toBeDefined();
        expect(event.event).toBeDefined();
      });
    });
  });
  
  describe('Expert Spec: Event Types Coverage (Lines 208-216)', () => {
    const eventTypes = [
      { type: EventType.CLAUDE_DELTA, payload: { delta: 'Thinking...' } },
      { type: EventType.TOOL_CALL, payload: { tool: 'bash', args: ['ls'] } },
      { type: EventType.TOOL_RETURN, payload: { result: 'file1.txt\nfile2.txt' } },
      { type: EventType.CLAUDE_STDOUT, payload: 'Running tests...' },
      { type: EventType.CLAUDE_STDERR, payload: 'Warning: deprecated' },
      { type: EventType.VERIFICATION_PASS, payload: { checks: {} } },
      { type: EventType.VERIFICATION_FAIL, payload: { reason: 'No files created' } }
    ];
    
    eventTypes.forEach(({ type, payload }) => {
      it(`should handle ${type} events correctly`, () => {
        let received = false;
        
        eventBus.once(type, (event) => {
          received = true;
          expect(event.event).toBe(type);
          expect(event.payload).toEqual(payload);
        });
        
        eventBus.logEvent({
          taskId: 'event-type-test',
          workerId: 'test',
          event: type,
          payload
        });
        
        expect(received).toBe(true);
      });
    });
  });
  
  describe('Expert Spec: Parent-Child Task Correlation', () => {
    it('should maintain parent-child relationships in events', () => {
      const parentId = 'parent-task-123';
      const childId = 'child-task-456';
      
      // Parent task
      eventBus.logEvent({
        taskId: parentId,
        workerId: 'master',
        event: EventType.TASK_START,
        payload: { prompt: 'Parent task' }
      });
      
      // Child task with parent reference
      eventBus.logEvent({
        taskId: childId,
        parentId: parentId,
        workerId: 'worker-1',
        event: EventType.TASK_START,
        payload: { prompt: 'Child task' }
      });
      
      // Verify relationship is maintained
      const events: LedgerEvent[] = [];
      eventBus.on('event', (e) => events.push(e));
      
      eventBus.logEvent({
        taskId: childId,
        parentId: parentId,
        workerId: 'worker-1',
        event: EventType.TASK_COMPLETE,
        payload: {}
      });
      
      const childComplete = events.find(e => 
        e.taskId === childId && e.event === EventType.TASK_COMPLETE
      );
      
      expect(childComplete).toBeDefined();
      expect(childComplete!.parentId).toBe(parentId);
    });
  });
  
  describe('Expert Spec: Event Bus Statistics', () => {
    it('should track event statistics accurately', () => {
      const initialStats = eventBus.getStats();
      const initialCount = initialStats.eventCount;
      
      // Log events
      for (let i = 0; i < 10; i++) {
        eventBus.logEvent({
          taskId: `task-${i}`,
          workerId: 'test',
          event: EventType.TOOL_CALL,
          payload: { index: i }
        });
      }
      
      const finalStats = eventBus.getStats();
      expect(finalStats.eventCount).toBe(initialCount + 10);
      expect(finalStats.eventsPerSecond).toBeGreaterThan(0);
    });
  });
  
  describe('Expert Spec: TaskLogger Convenience API', () => {
    it('should provide task-scoped logging interface', () => {
      const taskLogger = eventBus.createTaskLogger('task-123', 'worker-1');
      
      const events: LedgerEvent[] = [];
      eventBus.on('event', (e) => {
        if (e.taskId === 'task-123') events.push(e);
      });
      
      taskLogger.start({ prompt: 'Test task' });
      taskLogger.toolCall('bash', { command: 'ls' });
      taskLogger.verification({
        passed: true,
        checks: {
          filesCreated: true,
          testsPass: true,
          coverageMet: true,
          noVulnerabilities: true,
          actuallyRuns: true
        }
      });
      taskLogger.complete({ duration: 1000 });
      
      expect(events.length).toBe(4);
      expect(events[0].event).toBe(EventType.TASK_START);
      expect(events[1].event).toBe(EventType.TOOL_CALL);
      expect(events[2].event).toBe(EventType.VERIFICATION_PASS);
      expect(events[3].event).toBe(EventType.TASK_COMPLETE);
      
      // All should have same taskId and workerId
      events.forEach(e => {
        expect(e.taskId).toBe('task-123');
        expect(e.workerId).toBe('worker-1');
      });
    });
  });
  
  describe('Expert Spec: Error Event Handling', () => {
    it('should handle error events with stack traces', () => {
      const error = new Error('Test error');
      
      eventBus.logEvent({
        taskId: 'error-task',
        workerId: 'worker-1',
        event: EventType.ERROR,
        payload: {
          error: error.message,
          stack: error.stack
        }
      });
      
      let capturedError: any = null;
      eventBus.once(EventType.ERROR, (e) => {
        capturedError = e.payload;
      });
      
      eventBus.logEvent({
        taskId: 'error-task',
        workerId: 'worker-1',
        event: EventType.ERROR,
        payload: { error: 'Another error' }
      });
      
      expect(capturedError).toBeDefined();
      expect(capturedError.error).toBe('Another error');
    });
  });
});