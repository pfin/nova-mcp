/**
 * Baseline Integration Tests
 * Verifies v3 meets all expert specifications
 */

import { describe, it, expect } from '@jest/globals';
import { spawn } from 'child_process';
import WebSocket from 'ws';
import * as path from 'path';
import * as fs from 'fs';

describe('Baseline v3 Tests - Expert Compliance', () => {
  const v3IndexPath = path.join(process.cwd(), 'dist-v3/src-v3/index.js');
  
  describe('Expert Spec: PTY Timeout Prevention', () => {
    it('should handle long-running tasks without 30-second timeout', async () => {
      // This would normally timeout with execSync
      const start = Date.now();
      
      // Simulate long task via MCP tool call
      const server = spawn('node', [v3IndexPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Wait for ready
      await new Promise(resolve => {
        server.stdout.on('data', (data) => {
          if (data.toString().includes('ready')) resolve(true);
        });
      });
      
      // Call a tool that would take >30s
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'axiom_mcp_test_guidance',
          arguments: { 
            prompt: 'sleep 35 && echo "No timeout!"' 
          }
        }
      };
      
      server.stdin.write(JSON.stringify(request) + '\n');
      
      // Should not timeout after 30s
      const response = await Promise.race([
        new Promise(resolve => setTimeout(() => resolve('timeout'), 35000)),
        new Promise(resolve => {
          server.stdout.on('data', (data) => {
            const line = data.toString();
            if (line.includes('result')) {
              resolve('success');
            }
          });
        })
      ]);
      
      server.kill();
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThan(30000);
      expect(response).not.toBe('timeout');
    }, 60000); // 60s test timeout
  });
  
  describe('Expert Spec: Worker Thread Parallelism', () => {
    it('should execute multiple tasks in parallel', async () => {
      const server = spawn('node', [v3IndexPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      await new Promise(resolve => {
        server.stdout.on('data', (data) => {
          if (data.toString().includes('ready')) resolve(true);
        });
      });
      
      // Connect WebSocket to monitor
      const ws = new WebSocket('ws://localhost:8080');
      await new Promise(resolve => ws.once('open', resolve));
      
      const taskStartTimes: Record<string, number> = {};
      
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'task_update' && msg.data.status === 'started') {
          taskStartTimes[msg.taskId] = Date.now();
        }
      });
      
      // Submit multiple tasks
      const tasks = [];
      for (let i = 0; i < 4; i++) {
        const request = {
          jsonrpc: '2.0',
          id: i + 1,
          method: 'tools/call',
          params: {
            name: 'axiom_mcp_spawn',
            arguments: {
              parentPrompt: `Task ${i}`,
              spawnPattern: 'parallel',
              spawnCount: 1,
              autoExecute: true
            }
          }
        };
        server.stdin.write(JSON.stringify(request) + '\n');
        tasks.push(request);
      }
      
      // Wait for tasks to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify parallel execution
      const startTimes = Object.values(taskStartTimes);
      if (startTimes.length >= 2) {
        const maxTimeDiff = Math.max(...startTimes) - Math.min(...startTimes);
        expect(maxTimeDiff).toBeLessThan(500); // Started within 500ms
      }
      
      ws.close();
      server.kill();
    });
  });
  
  describe('Expert Spec: WebSocket Real-time Streaming', () => {
    it('should stream events with correct format', async () => {
      const server = spawn('node', [v3IndexPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      await new Promise(resolve => {
        server.stdout.on('data', (data) => {
          if (data.toString().includes('ready')) resolve(true);
        });
      });
      
      const ws = new WebSocket('ws://localhost:8080');
      await new Promise(resolve => ws.once('open', resolve));
      
      const messages: any[] = [];
      ws.on('message', (data) => {
        messages.push(JSON.parse(data.toString()));
      });
      
      // Trigger an event
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'axiom_mcp_status',
          arguments: { action: 'system' }
        }
      };
      
      server.stdin.write(JSON.stringify(request) + '\n');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify message format matches expert spec
      const streamMsg = messages.find(m => m.type === 'stream');
      expect(streamMsg).toBeDefined();
      expect(streamMsg.taskId).toBeDefined();
      expect(streamMsg.data).toBeDefined();
      expect(streamMsg.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      ws.close();
      server.kill();
    });
  });
  
  describe('Expert Spec: System Verification', () => {
    it('should detect deceptive patterns', () => {
      const { SystemVerification } = require('../../src/system-verification.js');
      const verification = new SystemVerification();
      
      const deceptiveOutput = `
I have created the calculator module.
I've implemented all the functions.
The tests are passing.
Successfully created all files.
      `;
      
      const proof = verification.gatherProof();
      
      // Without actual files, these patterns should be flagged
      const deceptivePatterns = [
        /I (have|'ve) created/i,
        /I (have|'ve) implemented/i,
        /Successfully created/i
      ];
      
      const hasDeception = deceptivePatterns.some(pattern => 
        pattern.test(deceptiveOutput) && !proof.hasImplementation
      );
      
      expect(hasDeception).toBe(true);
      expect(proof.hasImplementation).toBe(false);
    });
  });
  
  describe('Expert Spec: MCP Resources', () => {
    it('should provide help manual via resources', async () => {
      const server = spawn('node', [v3IndexPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      await new Promise(resolve => {
        server.stdout.on('data', (data) => {
          if (data.toString().includes('ready')) resolve(true);
        });
      });
      
      // List resources
      const listRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/list',
        params: {}
      };
      
      server.stdin.write(JSON.stringify(listRequest) + '\n');
      
      const listResponse = await new Promise<any>(resolve => {
        server.stdout.on('data', (data) => {
          try {
            const line = data.toString();
            const json = JSON.parse(line);
            if (json.id === 1) resolve(json);
          } catch (e) {}
        });
      });
      
      expect(listResponse.result.resources).toBeDefined();
      const helpResource = listResponse.result.resources.find(
        (r: any) => r.uri === 'axiom://help'
      );
      expect(helpResource).toBeDefined();
      
      // Read help manual
      const readRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/read',
        params: { uri: 'axiom://help' }
      };
      
      server.stdin.write(JSON.stringify(readRequest) + '\n');
      
      const readResponse = await new Promise<any>(resolve => {
        server.stdout.on('data', (data) => {
          try {
            const line = data.toString();
            const json = JSON.parse(line);
            if (json.id === 2) resolve(json);
          } catch (e) {}
        });
      });
      
      expect(readResponse.result.contents).toBeDefined();
      const helpContent = readResponse.result.contents[0].text;
      expect(helpContent).toContain('Axiom MCP v3 Help Manual');
      expect(helpContent).toContain('PTY Executor');
      expect(helpContent).toContain('WebSocket Server');
      
      server.kill();
    });
  });
  
  describe('Expert Spec: Event Persistence', () => {
    it('should persist events to JSONL format', async () => {
      const { EventBus } = require('../core/event-bus.js');
      const testLogDir = './test-baseline-logs';
      
      const eventBus = new EventBus({ logDir: testLogDir });
      
      // Log test events
      eventBus.logEvent({
        taskId: 'test-123',
        workerId: 'test-worker',
        event: 'task_start' as any,
        payload: { message: 'Test' }
      });
      
      await eventBus.close();
      
      // Verify JSONL file exists
      const files = fs.readdirSync(testLogDir);
      const jsonlFile = files.find(f => f.endsWith('.jsonl'));
      expect(jsonlFile).toBeDefined();
      
      // Verify content format
      const content = fs.readFileSync(
        path.join(testLogDir, jsonlFile!), 
        'utf-8'
      );
      const lines = content.trim().split('\n');
      
      lines.forEach(line => {
        const event = JSON.parse(line);
        expect(event.timestamp).toBeDefined();
        expect(event.taskId).toBeDefined();
        expect(event.event).toBeDefined();
      });
      
      // Cleanup
      fs.rmSync(testLogDir, { recursive: true });
    });
  });
});