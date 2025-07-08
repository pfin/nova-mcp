#!/usr/bin/env node

import { SessionBasedExecutor } from './dist-v4/executors/session-based-executor.js';

console.log('=== Testing Session-Based Intervention ===\n');

const executor = new SessionBasedExecutor();

// Track output
let fullOutput = '';
const streamHandler = (data) => {
  fullOutput += data;
  // Clean ANSI codes for display
  const clean = data.replace(/\x1b\[[0-9;]*m/g, '');
  process.stdout.write(clean);
};

console.log('1. Starting: Create fibonacci in Python\n');

const taskId = 'test-' + Date.now();

// Start execution (non-blocking in verbose mode)
const executionPromise = executor.execute(
  'Create a fibonacci function in Python',
  'Test system prompt', 
  taskId,
  streamHandler
);

// After 5 seconds, send intervention
setTimeout(() => {
  console.log('\n\n2. INTERVENING: Actually make it Java instead!\n');
  executor.write('Actually, change that to Java instead');
}, 5000);

// Monitor for 30 seconds
setTimeout(() => {
  console.log('\n\n3. Checking results...\n');
  
  const hasJavaCode = fullOutput.includes('public class') || 
                      fullOutput.includes('public static') ||
                      fullOutput.includes('.java');
  const hasPythonCode = fullOutput.includes('def fibonacci') ||
                        fullOutput.includes('.py');
  
  console.log('Output contains Java code:', hasJavaCode);
  console.log('Output contains Python code:', hasPythonCode);
  
  if (hasJavaCode && !hasPythonCode) {
    console.log('\n✅ SUCCESS: Claude switched to Java!');
  } else if (hasJavaCode && hasPythonCode) {
    console.log('\n⚠️  PARTIAL: Claude created both');
  } else {
    console.log('\n❌ FAIL: Claude did not switch');
  }
  
  executor.kill();
  process.exit(0);
}, 30000);

console.log('Test running (30 second timeout)...\n');