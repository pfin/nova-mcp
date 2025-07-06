#!/usr/bin/env node

import * as pty from 'node-pty';

console.log('Testing minimal claude execution with PTY...');

const ptyProcess = pty.spawn('claude', [
  '--dangerously-skip-permissions',
  '-p',
  'Just output: Hello from Claude'
], {
  name: 'xterm-color',
  cols: 120,
  rows: 40,
  cwd: process.cwd(),
  env: { 
    ...process.env,
    FORCE_COLOR: '0'
  }
});

let output = '';

ptyProcess.onData((data) => {
  output += data;
  console.log('[DATA]', JSON.stringify(data));
});

ptyProcess.onExit(({ exitCode, signal }) => {
  console.log('[EXIT] exitCode:', exitCode, 'signal:', signal);
  console.log('[FINAL OUTPUT]', output);
  process.exit(0);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.error('Test timed out after 30 seconds');
  ptyProcess.kill();
  process.exit(1);
}, 30000);