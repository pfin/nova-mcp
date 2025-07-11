#\!/usr/bin/env node

import { spawn } from 'node-pty';

console.log('Testing Claude CLI directly...\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let output = '';
let promptReady = false;

claude.onData((data) => {
  output += data;
  process.stdout.write(data);
  
  // Check if prompt is ready
  if (\!promptReady && output.includes('>') && output.includes('─')) {
    promptReady = true;
    console.log('\n\n[TEST] Claude prompt detected\! Sending test prompt...\n');
    
    // Type a simple prompt
    const prompt = 'Say hello';
    setTimeout(async () => {
      for (const char of prompt) {
        claude.write(char);
        await new Promise(r => setTimeout(r, 100));
      }
      
      console.log('\n[TEST] Prompt typed. Trying different submission methods...\n');
      
      // Try different ways to submit
      setTimeout(() => {
        console.log('[TEST] Trying Ctrl+Enter...');
        claude.write('\x0d');
      }, 500);
      
      setTimeout(() => {
        console.log('[TEST] Trying Enter...');
        claude.write('\n');
      }, 2000);
      
      setTimeout(() => {
        console.log('[TEST] Trying Return...');
        claude.write('\r');
      }, 4000);
      
    }, 1000);
  }
});

claude.onExit(() => {
  console.log('\n[TEST] Claude exited');
  process.exit(0);
});

// Exit after 15 seconds
setTimeout(() => {
  console.log('\n[TEST] Timeout - checking final output length:', output.length);
  claude.kill();
  process.exit(1);
}, 15000);
EOF < /dev/null
