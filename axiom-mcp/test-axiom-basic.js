#!/usr/bin/env node

import { SimpleExecutor } from './dist-v4/executors/simple-executor.js';

console.log('=== Basic Axiom Test ===\n');

const executor = new SimpleExecutor();

// Test stream handler
const streamHandler = (data) => {
  console.log('[STREAM]', data);
};

// Test execution
console.log('1. Testing Python task...');
executor.execute(
  'Create hello.py with print statement',
  'system prompt',
  'test-1',
  streamHandler
).then(result => {
  console.log('\nResult:', result);
  console.log('\n2. Testing Java task...');
  
  return executor.execute(
    'Create Hello.java file',
    'system prompt', 
    'test-2',
    streamHandler
  );
}).then(result => {
  console.log('\nResult:', result);
  console.log('\n3. Testing intervention...');
  
  // Start Python task
  const promise = executor.execute(
    'Create fibonacci in Python',
    'system prompt',
    'test-3',
    streamHandler  
  );
  
  // Intervene after 500ms
  setTimeout(() => {
    console.log('\n[INTERVENING]');
    executor.write('Change to Java instead');
  }, 500);
  
  return promise;
}).then(result => {
  console.log('\nResult:', result);
  console.log('\nTest complete!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});