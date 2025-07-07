#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

// Spawn the actual MCP client to connect to our running server
const mcp = spawn('node', ['dist-v4/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send initialization
const init = {
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

// Send axiom_spawn request after init
const spawnRequest = {
  jsonrpc: '2.0',
  method: 'tools/call',
  params: {
    name: 'axiom_spawn',
    arguments: {
      prompt: 'Write a simple file test.txt with content "Hello from PTY test"',
      verboseMasterMode: true
    }
  },
  id: 2
};

mcp.stdout.on('data', (data) => {
  console.log('MCP OUT:', data.toString());
  
  // Send spawn request after getting initialized response
  if (data.toString().includes('"initialized"')) {
    console.log('Sending axiom_spawn request...');
    mcp.stdin.write(JSON.stringify(spawnRequest) + '\n');
  }
});

mcp.stderr.on('data', (data) => {
  console.error('MCP ERR:', data.toString());
});

// Send init
console.log('Sending init...');
mcp.stdin.write(JSON.stringify(init) + '\n');

// Wait and check logs
setTimeout(() => {
  console.log('\n=== Checking debug logs ===');
  const logFiles = fs.readdirSync('logs-v4').filter(f => f.startsWith('debug-'));
  if (logFiles.length > 0) {
    const latestLog = logFiles.sort().pop();
    console.log('Latest log:', latestLog);
    const content = fs.readFileSync(`logs-v4/${latestLog}`, 'utf8');
    console.log('\nLog content:');
    console.log(content);
  }
  
  process.exit(0);
}, 5000);