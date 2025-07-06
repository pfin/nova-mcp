/**
 * WebSocket Server Tests
 * Based on expert specifications from GoodIdeasFromOtherModels.txt
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import WebSocket from 'ws';
import { EventBus, EventType } from '../core/event-bus.js';
import { MonitoringWebSocketServer } from '../server/websocket-server.js';

describe('WebSocket Server - Expert Specification Tests', () => {
  let eventBus: EventBus;
  let wsServer: MonitoringWebSocketServer;
  let client: WebSocket;
  let messages: any[] = [];
  
  beforeEach(async () => {
    // Create components
    eventBus = new EventBus({ logDir: './test-logs' });
    wsServer = new MonitoringWebSocketServer(eventBus, 8080);
    
    // Wait for server
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Connect client
    client = new WebSocket('ws://localhost:8080');
    messages = [];
    
    client.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });
    
    await new Promise(resolve => client.once('open', resolve));
  });
  
  afterEach(async () => {
    client.close();
    await wsServer.shutdown();
    await eventBus.close();
  });
  
  describe('Expert Spec: WebSocket Message Format (Lines 207-208)', () => {
    it('should send messages in format { taskId: "xyz", data: "..." }', async () => {
      // From docs: ws.send(JSON.stringify({ taskId: 'xyz', data: '...' }))
      eventBus.logEvent({
        taskId: 'xyz',
        workerId: 'test-worker',
        event: EventType.TASK_START,
        payload: { test: 'data' }
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const streamMsg = messages.find(m => m.type === 'stream');
      expect(streamMsg).toBeDefined();
      expect(streamMsg.taskId).toBe('xyz');
      expect(streamMsg.data).toBeDefined();
      expect(streamMsg.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
  
  describe('Expert Spec: Bi-directional Communication (Lines 208-209)', () => {
    it('should support intervention commands from client to server', async () => {
      // From docs: "persistent, low-latency, bi-directional communication"
      let interventionReceived = null;
      
      wsServer.on('intervention', (data) => {
        interventionReceived = data;
      });
      
      // Send intervention as per spec
      client.send(JSON.stringify({
        type: 'intervene',
        taskId: 'xyz',
        prompt: 'Stop what you\'re doing and add comments first.'
      }));
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(interventionReceived).toBeDefined();
      expect(interventionReceived.taskId).toBe('xyz');
      expect(interventionReceived.prompt).toContain('add comments');
    });
  });
  
  describe('Expert Spec: Event Streaming Protocol (Lines 201-207)', () => {
    it('should stream PTY output from worker to clients', async () => {
      // Simulate worker streaming PTY output
      eventBus.logEvent({
        taskId: 'worker-task-123',
        workerId: 'worker-1',
        event: EventType.CLAUDE_STDOUT,
        payload: 'user@machine:~$ running tests...'
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const streamMsg = messages.find(m => 
        m.type === 'stream' && 
        m.data.event === EventType.CLAUDE_STDOUT
      );
      
      expect(streamMsg).toBeDefined();
      expect(streamMsg.taskId).toBe('worker-task-123');
      expect(streamMsg.data.payload).toContain('running tests');
    });
  });
  
  describe('Expert Spec: Multiple Client Support', () => {
    it('should broadcast to all connected clients', async () => {
      // Connect second client
      const client2 = new WebSocket('ws://localhost:8080');
      const messages2: any[] = [];
      
      client2.on('message', (data) => {
        messages2.push(JSON.parse(data.toString()));
      });
      
      await new Promise(resolve => client2.once('open', resolve));
      
      // Send event
      eventBus.logEvent({
        taskId: 'broadcast-test',
        workerId: 'master',
        event: EventType.TASK_COMPLETE,
        payload: { result: 'success' }
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Both clients should receive
      const msg1 = messages.find(m => m.taskId === 'broadcast-test');
      const msg2 = messages2.find(m => m.taskId === 'broadcast-test');
      
      expect(msg1).toBeDefined();
      expect(msg2).toBeDefined();
      expect(msg1.data.event).toBe(EventType.TASK_COMPLETE);
      expect(msg2.data.event).toBe(EventType.TASK_COMPLETE);
      
      client2.close();
    });
  });
  
  describe('Expert Spec: Verification Events (Lines 253-254)', () => {
    it('should stream verification pass/fail events', async () => {
      // Verification pass
      eventBus.logEvent({
        taskId: 'verify-123',
        workerId: 'worker-1',
        event: EventType.VERIFICATION_PASS,
        payload: {
          checks: {
            filesCreated: true,
            testsPass: true,
            coverageMet: true
          }
        }
      });
      
      // Verification fail
      eventBus.logEvent({
        taskId: 'verify-456',
        workerId: 'worker-2',
        event: EventType.VERIFICATION_FAIL,
        payload: {
          checks: {
            filesCreated: false,
            testsPass: false
          },
          deceptivePatterns: ['Claimed implementation without actual files']
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const passMsg = messages.find(m => 
        m.type === 'verification' && m.data.passed === true
      );
      const failMsg = messages.find(m => 
        m.type === 'verification' && m.data.passed === false
      );
      
      expect(passMsg).toBeDefined();
      expect(passMsg.taskId).toBe('verify-123');
      
      expect(failMsg).toBeDefined();
      expect(failMsg.taskId).toBe('verify-456');
      expect(failMsg.data.verification.deceptivePatterns).toBeDefined();
    });
  });
  
  describe('Expert Spec: TOOL_INVOCATION Streaming', () => {
    it('should stream tool invocations parsed from Claude output', async () => {
      eventBus.logEvent({
        taskId: 'tool-test',
        workerId: 'worker-1',
        event: EventType.TOOL_CALL,
        payload: {
          tool: 'file_write',
          params: { path: 'test.py', content: 'print("hello")' }
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const toolMsg = messages.find(m => 
        m.type === 'stream' && 
        m.data.event === EventType.TOOL_CALL
      );
      
      expect(toolMsg).toBeDefined();
      expect(toolMsg.data.payload.tool).toBe('file_write');
    });
  });
  
  describe('Expert Spec: Error Handling', () => {
    it('should handle and stream errors gracefully', async () => {
      // Send intervention for non-existent task
      wsServer.emit('intervention', {
        taskId: 'non-existent',
        prompt: 'test',
        clientId: 'test-client'
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const errorMsg = messages.find(m => m.type === 'error');
      expect(errorMsg).toBeDefined();
      expect(errorMsg.data.message).toContain('failed');
    });
  });
  
  describe('Expert Spec: Connection Lifecycle', () => {
    it('should handle client disconnection gracefully', async () => {
      const initialStatus = wsServer.getStatus();
      expect(initialStatus.clients).toBe(1);
      
      client.close();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalStatus = wsServer.getStatus();
      expect(finalStatus.clients).toBe(0);
    });
  });
});