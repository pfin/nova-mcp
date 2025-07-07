// Test v4 tool call

const readline = require('readline');
const { spawn } = require('child_process');

const server = spawn('node', ['dist-v4/index.js']);

// Send list tools request
const listRequest = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {}
}) + '\n';

server.stdin.write(listRequest);

// Handle response
let sentCall = false;
server.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
  
  // Only send call once after getting tools list
  if (!sentCall && data.toString().includes('axiom_spawn')) {
    sentCall = true;
    
    // Try calling the tool
    const callRequest = JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "axiom_spawn",
        arguments: {
          prompt: "Create hello.txt file with content 'Hello from Axiom v4!'",
          verboseMasterMode: true
        }
      }
    }) + '\n';
    
    console.log('\nSending tool call...\n');
    server.stdin.write(callRequest);
  }
});

server.stderr.on('data', (data) => {
  console.error('Server log:', data.toString());
});

// Exit after 5 seconds
setTimeout(() => {
  server.kill();
  process.exit(0);
}, 5000);