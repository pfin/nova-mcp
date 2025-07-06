#!/usr/bin/env node

// Test axiom-mcp spawn functionality
const { spawn } = await import('child_process');

// Start axiom-mcp server
const axiomProcess = spawn('node', ['/home/peter/nova-mcp/axiom-mcp/dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, CLAUDE_API_KEY: process.env.ANTHROPIC_API_KEY }
});

// Send initialize request
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

axiomProcess.stdin.write(JSON.stringify(initRequest) + '\n');

// Listen for responses
axiomProcess.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});

axiomProcess.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

// Give it time to initialize
setTimeout(() => {
  // Send tools/list request
  const listRequest = {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 2
  };
  
  axiomProcess.stdin.write(JSON.stringify(listRequest) + '\n');
  
  // Wait and exit
  setTimeout(() => {
    axiomProcess.kill();
    process.exit(0);
  }, 2000);
}, 2000);