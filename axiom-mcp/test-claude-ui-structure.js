import { spawn } from 'node-pty';
import { setTimeout } from 'timers/promises';

console.log('=== Claude UI Structure Test ===');
console.log('Understanding the two-line input area\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let buffer = '';
let inputAreaDetected = false;

// Parse ANSI escape sequences to understand UI
claude.onData((data) => {
  buffer += data;
  process.stdout.write(data);
  
  // Look for the input area pattern
  if (!inputAreaDetected && buffer.includes('> ') && buffer.includes('[7m')) {
    inputAreaDetected = true;
    console.log('\n\n[DETECTED] Input area structure found!');
    console.log('First line: prompt after ">"');
    console.log('Second line: additional input area');
  }
});

// Test sequence
async function runTest() {
  // Wait for UI
  await setTimeout(2000);
  
  console.log('\n[TEST 1] Type on first line...');
  claude.write('print("hello")');
  await setTimeout(1000);
  
  console.log('\n[TEST 2] Try Tab to move to second line...');
  claude.write('\t');
  await setTimeout(1000);
  
  console.log('\n[TEST 3] Try Down arrow...');
  claude.write('\x1b[B');
  await setTimeout(1000);
  
  console.log('\n[TEST 4] Try Shift+Enter...');
  claude.write('\x1b[13;2u');
  await setTimeout(1000);
  
  console.log('\n[TEST 5] Try Alt+Enter...');
  claude.write('\x1b\r');
  await setTimeout(1000);
  
  console.log('\n[TEST 6] Back to basics - just Enter...');
  claude.write('\n');
  await setTimeout(2000);
  
  // Check if anything happened
  console.log('\n[CHECK] Looking for signs of execution...');
  if (buffer.includes('Actioning')) {
    console.log('✓ Claude is processing!');
  } else if (buffer.includes('```')) {
    console.log('✓ Code output detected!');
  } else {
    console.log('✗ No execution detected');
    console.log('\n[DEBUG] Buffer contains:');
    console.log('- "print":', buffer.includes('print'));
    console.log('- Two input lines:', buffer.split('│').length);
  }
  
  await setTimeout(3000);
  claude.write('/quit\n');
}

runTest().catch(console.error);

claude.onExit(() => {
  console.log('\n=== Test Complete ===');
});