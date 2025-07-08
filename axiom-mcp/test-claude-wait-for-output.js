import { spawn } from 'node-pty';
import fs from 'fs';

console.log('=== Testing Claude - Wait for Actual Output ===');
console.log('Will wait longer and capture everything\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let output = '';
let phase = 'INIT';
let lastOutputTime = Date.now();

claude.onData((data) => {
  output += data;
  lastOutputTime = Date.now();
  process.stdout.write(data);
  
  // Log significant events
  if (data.includes('shortcuts')) {
    console.log('\n[EVENT] Claude UI ready');
  }
  if (data.includes('Actioning')) {
    console.log('\n[EVENT] Claude is actioning!');
    phase = 'ACTIONING';
  }
  if (data.includes('```')) {
    console.log('\n[EVENT] Code block detected!');
  }
});

// Send prompt after Claude is ready
setTimeout(() => {
  console.log('\n[ACTION] Sending prompt...');
  claude.write('Write print("hello world") in Python\n');
}, 2000);

// Check progress periodically
const checkInterval = setInterval(() => {
  const timeSinceLastOutput = Date.now() - lastOutputTime;
  console.log(`\n[STATUS] Phase: ${phase}, Time since last output: ${timeSinceLastOutput}ms`);
  console.log(`[STATUS] Output length: ${output.length} chars`);
  
  // If we're in ACTIONING phase and see output, try to interrupt
  if (phase === 'ACTIONING' && output.length > 3500) {
    console.log('\n[INTERRUPT] Sending ESC...');
    claude.write('\x1b');
    clearInterval(checkInterval);
    
    setTimeout(() => {
      console.log('[STEER] Sending new instruction...');
      claude.write('print("AXIOM WORKS")\n');
    }, 500);
  }
}, 1000);

// Exit after 30 seconds
setTimeout(() => {
  console.log('\n\n[FINAL] Saving output to file...');
  fs.writeFileSync('claude-output.txt', output);
  console.log('Output saved to claude-output.txt');
  console.log('\n[EXIT] Sending /quit...');
  claude.write('/quit\n');
  setTimeout(() => claude.kill(), 1000);
}, 30000);

claude.onExit(() => {
  console.log('\n=== Final Summary ===');
  console.log('Total output:', output.length, 'characters');
  console.log('Contains "hello world":', output.includes('hello world'));
  console.log('Contains "AXIOM":', output.includes('AXIOM'));
});