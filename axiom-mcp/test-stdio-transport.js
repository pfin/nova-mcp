#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing Axiom MCP v3 stdio transport...');

// Spawn the MCP server
const serverPath = path.join(__dirname, 'dist-v3/src-v3/index-simple.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server stderr (debug messages)
server.stderr.on('data', (data) => {
  console.log('[SERVER DEBUG]', data.toString().trim());
});

// Send initialization request
const initRequest = {
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  },
  id: 1
};

// Send request
server.stdin.write(JSON.stringify(initRequest) + '\n');

// Handle response
let buffer = '';
server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line) {
      try {
        const response = JSON.parse(line);
        console.log('[RESPONSE]', JSON.stringify(response, null, 2));
        
        // If initialization successful, list tools
        if (response.id === 1 && response.result) {
          const toolsRequest = {
            jsonrpc: '2.0',
            method: 'tools/list',
            params: {},
            id: 2
          };
          server.stdin.write(JSON.stringify(toolsRequest) + '\n');
        } else if (response.id === 2) {
          // Got tools list, now call the test tool
          const callRequest = {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'axiom_test_v3',
              arguments: {
                prompt: 'bash date'
              }
            },
            id: 3
          };
          server.stdin.write(JSON.stringify(callRequest) + '\n');
        } else if (response.id === 3) {
          // Test complete
          console.log('Test completed successfully!');
          server.kill();
          process.exit(0);
        }
      } catch (e) {
        console.error('[PARSE ERROR]', e.message, line);
      }
    }
  }
  
  buffer = lines[lines.length - 1];
});

// Handle errors
server.on('error', (err) => {
  console.error('[SPAWN ERROR]', err);
});

server.on('exit', (code) => {
  console.log('[SERVER EXIT]', code);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('Test timed out');
  server.kill();
  process.exit(1);
}, 10000);