#!/usr/bin/env node

// Test script to check axiom-mcp connection
import { spawn } from 'child_process';

console.log('Testing axiom-mcp connection...');

// Try to connect to the running axiom-mcp server
const axiomProcess = spawn('node', ['/home/peter/nova-mcp/axiom-mcp/dist-v4/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send a tools/list request
const request = {
  jsonrpc: '2.0',
  method: 'tools/list',
  id: 1
};

axiomProcess.stdin.write(JSON.stringify(request) + '\n');

axiomProcess.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});

axiomProcess.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

setTimeout(() => {
  axiomProcess.kill();
  process.exit(0);
}, 2000);