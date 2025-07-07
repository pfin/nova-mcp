#!/usr/bin/env node

import { PtyExecutor } from './dist-v4/executors/pty-executor.js';
import { HookOrchestrator } from './dist-v4/core/hook-orchestrator.js';

console.log('=== Testing claude --print Detection ===\n');

// Create mock components
const mockDb = {};
const mockEventBus = {};
const mockStatusManager = {};

// Create orchestrator
const orchestrator = new HookOrchestrator(mockDb, mockEventBus, mockStatusManager);

// Create executor with orchestrator
const executor = new PtyExecutor({
  shell: 'bash',
  cwd: process.cwd(),
  hookOrchestrator: orchestrator
});

// Register executor
orchestrator.registerExecutor('axiom_spawn', executor);

console.log('Test 1: Simulating output with "claude --print"...');

// Simulate stream data that contains claude --print
const testStream = `
$ echo "I will use claude --print to execute this"
I will use claude --print to execute this
$ claude --print "do something"
`;

// Test the stream handler directly
const args = {
  prompt: 'test prompt',
  verboseMasterMode: true,
  notificationSender: async (taskId, data) => {
    console.log(`[NOTIFICATION ${taskId}]:`, data);
  }
};

// Start execution
console.log('\nStarting execution that will trigger claude --print...\n');

orchestrator.handleRequest('axiom_spawn', args)
  .then(result => {
    console.log('Result:', result);
    
    // Now simulate the bad stream data
    setTimeout(() => {
      console.log('\n--- Simulating stream with claude --print ---');
      const task = orchestrator.getActiveTask(result.taskId);
      if (task && task.executor) {
        // Simulate the PTY outputting claude --print
        task.executor.emit('data', testStream);
      }
    }, 100);
  })
  .catch(err => {
    console.error('Error:', err);
  });

// Also test direct detection
console.log('\nTest 2: Direct string detection:');
const testStrings = [
  'claude --print "hello"',
  'claude -p "test"',
  'using claude --print --dangerously-skip-permissions',
  'normal claude usage',
  'echo "claude --print should be detected"'
];

testStrings.forEach(str => {
  const detected = str.includes('claude --print') || str.includes('claude -p');
  console.log(`"${str.substring(0, 40)}..." -> ${detected ? '🚨 DETECTED' : '✅ OK'}`);
});

console.log('\nTest complete. Check output above for intervention messages.');

// Exit after a delay
setTimeout(() => process.exit(0), 2000);