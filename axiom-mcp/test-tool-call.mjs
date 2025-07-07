#!/usr/bin/env node

import { spawn } from 'child_process';

// Test actual tool invocation
console.log('Testing MCP Tool Call...\n');

const proc = spawn('node', ['dist-v3/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let outputBuffer = '';
let errorBuffer = '';

proc.stdout.on('data', (data) => {
  outputBuffer += data.toString();
  
  // Try to parse response
  try {
    const lines = outputBuffer.split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        if (response.id === 2 && response.result) {
          console.log('\n✅ Tool response received!');
          console.log(JSON.stringify(response, null, 2));
          
          // Check response format
          if (response.result.content) {
            console.log('\n✅ Response has MCP-compliant format (result.content)');
          } else if (response.content) {
            console.log('\n❌ Response has legacy format (content without result wrapper)');
          }
          
          proc.kill();
          return;
        }
      } catch (e) {
        // Not JSON
      }
    }
  } catch (e) {
    // Continue
  }
});

proc.stderr.on('data', (data) => {
  errorBuffer += data.toString();
});

proc.on('close', (code) => {
  console.log('\nServer closed.');
  if (errorBuffer) {
    console.log('\nSTDERR:');
    console.log(errorBuffer);
  }
});

// First, list tools to make sure server is ready
const listRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list"
};

proc.stdin.write(JSON.stringify(listRequest) + '\n');

// Then call a tool
setTimeout(() => {
  const callRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "axiom_mcp_observe",
      arguments: {
        mode: "recent",
        limit: 5
      }
    }
  };
  
  console.log('Calling tool:', JSON.stringify(callRequest, null, 2));
  proc.stdin.write(JSON.stringify(callRequest) + '\n');
}, 500);