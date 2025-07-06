#!/usr/bin/env node

import { PtyExecutor } from './dist-v3/src-v3/executors/pty-executor.js';

console.log('Testing PTY executor directly...');

const executor = new PtyExecutor({
  cwd: process.cwd(),
  heartbeatInterval: 5000
});

// Collect output
let output = '';
executor.on('data', (event) => {
  output += event.payload;
  console.log('[DATA]', event.payload);
});

executor.on('error', (event) => {
  console.error('[ERROR]', event);
});

executor.on('exit', (event) => {
  console.log('[EXIT]', event);
  console.log('[FINAL OUTPUT]', output);
  process.exit(0);
});

executor.on('heartbeat', () => {
  console.log('[HEARTBEAT]');
});

// Test with a simple command first
console.log('Executing: echo "Hello from PTY"');
executor.execute('echo', ['Hello from PTY'], 'test-123')
  .then(() => console.log('Execution completed'))
  .catch(err => {
    console.error('Execution failed:', err);
    process.exit(1);
  });

// Timeout after 10 seconds
setTimeout(() => {
  console.error('Test timed out');
  process.exit(1);
}, 10000);