import { spawn } from 'node-pty';

console.log('=== Testing Claude Direct Prompt Mode ===');
console.log('Using claude "prompt" syntax\n');

// Test direct prompt mode
const claude = spawn('claude', ['Write a simple hello world in Python'], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let output = '';
let interrupted = false;

claude.onData((data) => {
  output += data;
  process.stdout.write(data);
  
  // When we see Claude starting to write
  if (!interrupted && (output.includes("I'll") || output.includes('simple') || output.includes('Python'))) {
    console.log('\n\n[INTERRUPT] Detected output, sending ESC...');
    interrupted = true;
    
    // Send ESC to stop
    claude.write('\x1b');
    
    setTimeout(() => {
      console.log('[STEER] Sending new instruction...');
      claude.write('Make it print "AXIOM WORKS" instead\n');
    }, 500);
  }
});

claude.onExit((code) => {
  console.log('\n\n=== Results ===');
  console.log('Exit code:', code);
  console.log('Output contains "hello":', output.toLowerCase().includes('hello'));
  console.log('Output contains "AXIOM":', output.includes('AXIOM'));
  console.log('\nKey insight: Direct prompt mode may allow steering');
});

setTimeout(() => {
  console.log('\n[TIMEOUT] Ending test...');
  claude.kill();
}, 20000);