/**
 * Full Integration Test
 * Verifies the complete v3 system works end-to-end
 */

import { spawn } from 'child_process';
import WebSocket from 'ws';
import * as path from 'path';

describe('Full v3 Integration Test', () => {
  let serverProcess: any;
  let ws: WebSocket;
  
  beforeAll(async () => {
    // Start the v3 MCP server
    const indexPath = path.join(process.cwd(), 'dist-v3/src-v3/index.js');
    serverProcess = spawn('node', [indexPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, AXIOM_V3_TEST: 'true' }
    });
    
    // Wait for server to be ready
    await new Promise((resolve) => {
      serverProcess.stdout.on('data', (data: Buffer) => {
        if (data.toString().includes('ready')) {
          resolve(true);
        }
      });
    });
    
    // Connect WebSocket
    ws = new WebSocket('ws://localhost:8080');
    await new Promise(resolve => ws.once('open', resolve));
  });
  
  afterAll(async () => {
    if (ws) ws.close();
    if (serverProcess) {
      serverProcess.kill();
      await new Promise(resolve => serverProcess.on('exit', resolve));
    }
  });
  
  it('should start server and accept WebSocket connections', () => {
    expect(ws.readyState).toBe(WebSocket.OPEN);
  });
  
  it('should handle MCP tool calls via stdio', async () => {
    // Send a tool list request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };
    
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
    
    const response = await new Promise((resolve) => {
      serverProcess.stdout.once('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim() && line.includes('tools')) {
            resolve(JSON.parse(line));
            break;
          }
        }
      });
    });
    
    expect(response).toBeDefined();
    expect((response as any).result?.tools).toBeDefined();
    expect(Array.isArray((response as any).result?.tools)).toBe(true);
  });
  
  it('should stream events to WebSocket when tasks run', async () => {
    const messages: any[] = [];
    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });
    
    // Call a simple tool
    const request = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'axiom_mcp_status',
        arguments: { action: 'system' }
      }
    };
    
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
    
    // Wait for response and events
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Should have received WebSocket events
    expect(messages.length).toBeGreaterThan(0);
    const toolCallEvent = messages.find(m => 
      m.type === 'stream' && m.data?.event === 'tool_call'
    );
    expect(toolCallEvent).toBeDefined();
  });
  
  it('should handle errors gracefully', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'non_existent_tool',
        arguments: {}
      }
    };
    
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
    
    const response = await new Promise((resolve) => {
      serverProcess.stdout.once('data', (data: Buffer) => {
        const line = data.toString().trim();
        if (line.includes('error')) {
          resolve(JSON.parse(line));
        }
      });
    });
    
    expect((response as any).error).toBeDefined();
  });
});