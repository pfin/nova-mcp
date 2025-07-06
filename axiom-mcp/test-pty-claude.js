#!/usr/bin/env node

import { PtyExecutor } from './dist-v3/src-v3/executors/pty-executor.js';

console.log('Testing PTY executor with claude...');

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
  console.log('[FINAL OUTPUT LENGTH]', output.length);
  process.exit(0);
});

executor.on('heartbeat', () => {
  console.log('[HEARTBEAT]');
});

// Test with claude command
const args = [
  '--dangerously-skip-permissions',
  '-p',
  'bash date'
];

console.log('Executing: claude', args.join(' '));
executor.execute('claude', args, 'test-claude')
  .then(() => console.log('Execution completed'))
  .catch(err => {
    console.error('Execution failed:', err);
    process.exit(1);
  });

// Timeout after 30 seconds
setTimeout(() => {
  console.error('Test timed out after 30 seconds');
  process.exit(1);
}, 30000);