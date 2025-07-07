#!/usr/bin/env node

import { PtyExecutor } from './dist-v4/executors/pty-executor.js';

console.log('=== Direct PTY Test ===');
const executor = new PtyExecutor({
  shell: 'bash',
  cwd: process.cwd()
});

console.log('Creating PTY executor...');

const taskId = 'test-' + Date.now();
const prompt = 'Create a test file with echo';

console.log('Executing command...');
console.log('Prompt:', prompt);

// Set up stream handler
const streamHandler = (data) => {
  console.log('[STREAM]', data);
};

// Execute
executor.execute(prompt, 'Test system prompt', taskId, streamHandler)
  .then(output => {
    console.log('\n=== Execution Complete ===');
    console.log('Output length:', output.length);
    console.log('Output:', output);
  })
  .catch(err => {
    console.error('\n=== Execution Failed ===');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  })
  .finally(() => {
    console.log('\n=== Checking logs ===');
    process.exit(0);
  });

// Safety timeout
setTimeout(() => {
  console.log('\n=== TIMEOUT after 10 seconds ===');
  executor.kill();
  process.exit(1);
}, 10000);