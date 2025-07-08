import { spawn } from 'node-pty';

console.log('=== Testing Small Claude Control ===');
console.log('Starting with basic control tests\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let output = '';
let phase = 'INIT';

claude.onData((data) => {
  output += data;
  process.stdout.write(data);
});

// Test 1: Just quit immediately
setTimeout(() => {
  console.log('\n\n[TEST 1] Sending /quit command...');
  claude.write('/quit\n');
}, 2000);

claude.onExit((code) => {
  console.log('\n\n=== Test Complete ===');
  console.log('Claude exited with code:', code);
  console.log('Output length:', output.length);
  console.log('\nSmall control test: /quit works to exit Claude');
});

setTimeout(() => {
  console.log('\n[TIMEOUT] Force killing...');
  claude.kill();
}, 5000);