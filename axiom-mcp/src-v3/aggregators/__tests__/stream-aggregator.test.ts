import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamAggregator } from '../stream-aggregator.js';
import { EventEmitter } from 'events';
import { Writable } from 'stream';

describe('StreamAggregator', () => {
  let aggregator: StreamAggregator;
  let outputBuffer: string[];
  let mockOutputStream: Writable;
  
  beforeEach(() => {
    outputBuffer = [];
    mockOutputStream = new Writable({
      write(chunk, encoding, callback) {
        outputBuffer.push(chunk.toString());
        callback();
      }
    });
    
    aggregator = new StreamAggregator(
      null, // No parser for unit tests
      null, // No verifier for unit tests
      null, // No DB for unit tests
      mockOutputStream
    );
  });
  
  it('should prefix output with task ID', async () => {
    const mockExecutor = new EventEmitter();
    // Add pty property to simulate PtyExecutor
    (mockExecutor as any).pty = true;
    const taskId = 'abc123def456ghi789';
    
    aggregator.attachChild(taskId, mockExecutor as any);
    
    // Simulate PTY output
    mockExecutor.emit('data', {
      type: 'data',
      payload: 'Hello from child process\n'
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Check that output contains the prefixed message
    const hasOutput = outputBuffer.some(line => 
      line.includes('[abc123de]') && line.includes('Hello from child process')
    );
    expect(hasOutput).toBe(true);
  });
  
  it('should handle line buffering correctly', async () => {
    const mockExecutor = new EventEmitter();
    (mockExecutor as any).pty = true;
    const taskId = 'test123';
    
    aggregator.attachChild(taskId, mockExecutor as any);
    
    // Send partial lines
    mockExecutor.emit('data', { type: 'data', payload: 'Part 1' });
    mockExecutor.emit('data', { type: 'data', payload: ' Part 2\nComplete line\n' });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Should see properly buffered lines
    const hasBufferedLine = outputBuffer.some(line => 
      line.includes('[test123]') && line.includes('Part 1 Part 2')
    );
    const hasCompleteLine = outputBuffer.some(line => 
      line.includes('[test123]') && line.includes('Complete line')
    );
    
    expect(hasBufferedLine).toBe(true);
    expect(hasCompleteLine).toBe(true);
  });
  
  it('should track multiple streams', () => {
    const executor1 = new EventEmitter();
    const executor2 = new EventEmitter();
    (executor1 as any).pty = true;
    (executor2 as any).pty = true;
    
    aggregator.attachChild('task1', executor1 as any);
    aggregator.attachChild('task2', executor2 as any);
    
    expect(aggregator.getActiveCount()).toBe(2);
  });
  
  it('should emit intervention events', async () => {
    const mockExecutor = new EventEmitter();
    (mockExecutor as any).pty = true;
    const interventionSpy = vi.fn();
    
    aggregator.on('intervention', interventionSpy);
    aggregator.attachChild('task123', mockExecutor as any);
    
    mockExecutor.emit('data', {
      type: 'data',
      payload: '[INTERVENTION] Stop planning and implement!\n'
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(interventionSpy).toHaveBeenCalledWith({
      taskId: 'task123',
      line: '[INTERVENTION] Stop planning and implement!'
    });
  });
  
  it('should clean up on child exit', async () => {
    const mockExecutor = new EventEmitter();
    (mockExecutor as any).pty = true;
    const completeSpy = vi.fn();
    
    aggregator.on('child-complete', completeSpy);
    aggregator.attachChild('task123', mockExecutor as any);
    
    expect(aggregator.getActiveCount()).toBe(1);
    
    mockExecutor.emit('exit', { code: 0 });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(aggregator.getActiveCount()).toBe(0);
    expect(completeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task123',
        duration: expect.any(Number),
        lines: expect.any(Number),
        interventions: expect.any(Number)
      })
    );
  });
  
  it('should handle SDK executor events', async () => {
    const mockExecutor = new EventEmitter();
    // No pty property to simulate SdkExecutor
    const taskId = 'sdk-task-123';
    
    aggregator.attachChild(taskId, mockExecutor as any);
    
    // Simulate SDK delta event
    mockExecutor.emit('delta', {
      payload: {
        messageType: 'assistant',
        content: { text: 'Creating a function...' }
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const hasSdkOutput = outputBuffer.some(line => 
      line.includes('[sdk-task]') && line.includes('[SDK] Assistant message')
    );
    expect(hasSdkOutput).toBe(true);
  });
  
  it('should emit stats events periodically', async () => {
    const mockExecutor = new EventEmitter();
    (mockExecutor as any).pty = true;
    const statsSpy = vi.fn();
    
    aggregator.on('stats', statsSpy);
    aggregator.attachChild('task123', mockExecutor as any);
    
    // Send enough lines to trigger stats
    for (let i = 0; i < 15; i++) {
      mockExecutor.emit('data', {
        type: 'data',
        payload: `Line ${i}\n`
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(statsSpy).toHaveBeenCalled();
    expect(statsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task123',
        lines: expect.any(Number),
        bytes: expect.any(Number),
        interventions: expect.any(Number)
      })
    );
  });
  
  it('should return aggregate stats', () => {
    const executor1 = new EventEmitter();
    const executor2 = new EventEmitter();
    (executor1 as any).pty = true;
    (executor2 as any).pty = true;
    
    aggregator.attachChild('task1', executor1 as any);
    aggregator.attachChild('task2', executor2 as any);
    
    const stats = aggregator.getStats();
    
    expect(stats.activeCount).toBe(2);
    expect(stats.streams).toHaveLength(2);
    expect(stats.totalLines).toBe(0); // No output yet
    expect(stats.totalBytes).toBe(0);
    expect(stats.totalInterventions).toBe(0);
  });
});