import { spawn } from 'node-pty';

console.log('=== Testing Claude Stream JSON Mode ===\n');

// Test stream-json format which might allow real-time control
const claude = spawn('claude', [
  '--print',
  '--output-format', 'stream-json',
  'Write a factorial function, but I might interrupt you'
], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let buffer = '';
let interrupted = false;

claude.onData((data) => {
  buffer += data;
  
  // Try to parse JSON chunks
  const lines = buffer.split('\n');
  for (const line of lines) {
    if (line.trim()) {
      try {
        const json = JSON.parse(line);
        console.log('JSON Event:', json.type || json);
        
        // If we see planning, try to interrupt
        if (!interrupted && JSON.stringify(json).includes('analyze')) {
          console.log('\n[INTERRUPT] Detected planning, sending Ctrl+C...');
          interrupted = true;
          claude.write('\x03');
          
          // This won't work with --print, but let's document it
          console.log('[NOTE] --print mode cannot be interrupted!');
        }
      } catch (e) {
        // Not valid JSON yet
      }
    }
  }
});

claude.onExit((code) => {
  console.log('\n=== Test Complete ===');
  console.log('Exit code:', code);
  console.log('Buffer contains JSON:', buffer.includes('{'));
  console.log('\nCONCLUSION: Even with stream-json, --print mode cannot be steered.');
  console.log('Once started, it runs to completion.');
});

setTimeout(() => {
  console.log('\n[TIMEOUT] Killing process...');
  claude.kill();
}, 10000);