import { spawn } from 'node-pty';

console.log('=== Testing Claude Submit Keys ===');
console.log('Trying different ways to submit prompt\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let output = '';
let testPhase = 0;

claude.onData((data) => {
  output += data;
  process.stdout.write(data);
});

// Wait for Claude to be ready
setTimeout(() => {
  console.log('\n[TEST 1] Sending prompt with \\n...');
  claude.write('print("test1")\n');
  testPhase = 1;
}, 2000);

// Try Ctrl+Enter
setTimeout(() => {
  console.log('\n[TEST 2] Trying Ctrl+Enter (\\x0a)...');
  claude.write('\x0a');
}, 4000);

// Try just Enter again
setTimeout(() => {
  console.log('\n[TEST 3] Trying Enter (\\r)...');
  claude.write('\r');
}, 6000);

// Try Ctrl+J (line feed)
setTimeout(() => {
  console.log('\n[TEST 4] Trying Ctrl+J (\\x0a)...');
  claude.write('\x0a');
}, 8000);

// Check if anything is happening
setTimeout(() => {
  console.log('\n\n[STATUS] Checking output...');
  console.log('Output contains "Actioning":', output.includes('Actioning'));
  console.log('Output contains code:', output.includes('```'));
  console.log('Output length:', output.length);
  
  // If still nothing, try a different prompt
  console.log('\n[TEST 5] Trying /quit to see if commands work...');
  claude.write('/quit\n');
}, 10000);

claude.onExit(() => {
  console.log('\n\n=== Summary ===');
  console.log('Claude exited');
  console.log('Output contains any response:', output.includes('```') || output.includes('print'));
});

setTimeout(() => {
  console.log('\n[TIMEOUT] Force exit...');
  claude.kill();
}, 15000);