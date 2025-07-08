#!/usr/bin/env node

import { PtyExecutor } from './dist-v4/executors/pty-executor.js';
import { HookOrchestrator } from './dist-v4/core/hook-orchestrator.js';

console.log('=== Testing Python to Java Intervention ===\n');

// Create orchestrator
const orchestrator = new HookOrchestrator({}, {});

// Create executor
const executor = new PtyExecutor({
  shell: 'bash',
  cwd: process.cwd(),
  hookOrchestrator: orchestrator
});

// Register executor
orchestrator.registerExecutor('test', executor);

// Track output
let fullOutput = '';
const streamHandler = (data) => {
  fullOutput += data;
  process.stdout.write(data);
};

// Start the test
console.log('1. Starting task: Create fibonacci in Python\n');

const taskId = 'test-' + Date.now();
const executionPromise = executor.execute(
  'Create a fibonacci function in Python',
  'Test system prompt',
  taskId,
  streamHandler
);

// After 5 seconds, intervene
setTimeout(() => {
  console.log('\n\n2. INTERVENING: Change to Java instead!\n');
  executor.write('Actually, change that to Java instead\n');
  // Send Enter to submit
  setTimeout(() => {
    executor.write('\n');
  }, 100);
}, 5000);

// Monitor for 40 seconds total to give Claude time to respond
setTimeout(() => {
  console.log('\n\n3. Final check - did it switch to Java?\n');
  
  // Look for actual code, not just mentions
  const hasJavaCode = fullOutput.includes('public class') || 
                      fullOutput.includes('public static') ||
                      fullOutput.includes('.java');
  const hasPythonCode = fullOutput.includes('def fibonacci') ||
                        fullOutput.includes('.py');
  
  console.log('Output contains Java code:', hasJavaCode);
  console.log('Output contains Python code:', hasPythonCode);
  console.log('\nSearching output for key indicators...');
  
  if (fullOutput.includes('public class')) {
    console.log('✓ Found "public class"');
  }
  if (fullOutput.includes('def fibonacci')) {
    console.log('✓ Found "def fibonacci"');
  }
  if (fullOutput.includes('.java')) {
    console.log('✓ Found ".java"');
  }
  if (fullOutput.includes('.py')) {
    console.log('✓ Found ".py"');
  }
  
  if (hasJavaCode && !hasPythonCode) {
    console.log('\n✅ SUCCESS: Claude switched from Python to Java!');
  } else if (hasJavaCode && hasPythonCode) {
    console.log('\n⚠️  PARTIAL: Claude created both languages');
  } else {
    console.log('\n❌ FAIL: Claude did not switch to Java');
  }
  
  // Kill and exit
  executor.kill();
  process.exit(0);
}, 40000);

console.log('Test running... (40 second timeout)\n');