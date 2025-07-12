#!/usr/bin/env node
/**
 * Test the approval monitor hook
 * This should automatically handle file creation prompts
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('Testing Axiom MCP v4 Approval Monitor...\n');

// Set environment for debug logging
process.env.AXIOM_LOG_LEVEL = 'DEBUG';

// Spawn the MCP server
const mcpServer = spawn('node', [
  path.join(__dirname, 'dist-v4/index.js')
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

// MCP client simulation
async function testApprovalHandling() {
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Send axiom_spawn request
  const spawnRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'axiom_spawn',
      arguments: {
        prompt: 'Create test_approval.py with a hello world function',
        verboseMasterMode: true
      }
    },
    id: 1
  };
  
  console.log('Sending spawn request...');
  mcpServer.stdin.write(JSON.stringify(spawnRequest) + '\n');
  
  // Monitor output
  let taskId = null;
  
  mcpServer.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const msg = JSON.parse(line);
        
        // Extract taskId from response
        if (msg.id === 1 && msg.result?.content?.[0]?.text) {
          const content = JSON.parse(msg.result.content[0].text);
          if (content.taskId) {
            taskId = content.taskId;
            console.log(`Task started: ${taskId}`);
            
            // After getting taskId, wait and check status
            setTimeout(() => checkTaskStatus(taskId), 5000);
          }
        }
        
        // Look for notifications about approvals
        if (msg.method === 'notifications/message') {
          const text = msg.params?.message || '';
          if (text.includes('Auto-responding') || text.includes('approval:handled')) {
            console.log('✅ Approval handled automatically!');
          }
        }
        
      } catch (e) {
        // Not JSON, might be debug output
        if (line.includes('APPROVAL-MONITOR')) {
          console.log(`Monitor: ${line}`);
        }
      }
    }
  });
  
  mcpServer.stderr.on('data', (data) => {
    console.error('Error:', data.toString());
  });
}

async function checkTaskStatus(taskId) {
  const statusRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'axiom_status',
      arguments: { taskId }
    },
    id: 2
  };
  
  console.log(`\nChecking status of ${taskId}...`);
  mcpServer.stdin.write(JSON.stringify(statusRequest) + '\n');
  
  // Check for file creation
  setTimeout(() => {
    const fs = require('fs');
    if (fs.existsSync('test_approval.py')) {
      console.log('✅ File created successfully!');
      console.log('✅ Approval monitor worked!');
      
      // Clean up
      fs.unlinkSync('test_approval.py');
      mcpServer.kill();
      process.exit(0);
    } else {
      console.log('❌ File not created - approval might be stuck');
      mcpServer.kill();
      process.exit(1);
    }
  }, 10000);
}

// Run test
testApprovalHandling().catch(err => {
  console.error('Test failed:', err);
  mcpServer.kill();
  process.exit(1);
});

// Timeout
setTimeout(() => {
  console.log('❌ Test timed out');
  mcpServer.kill();
  process.exit(1);
}, 30000);