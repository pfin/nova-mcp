import { spawn } from 'node-pty';

console.log('=== Testing Claude Interactive Steering ===');
console.log('Goal: Steer Claude mid-stream in interactive mode\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let output = '';
let phase = 'WAITING_FOR_READY';
let sentPrompt = false;
let sentInterrupt = false;

claude.onData((data) => {
  output += data;
  process.stdout.write(data);
  
  // Wait for Claude to be ready
  if (phase === 'WAITING_FOR_READY' && output.includes('shortcuts')) {
    phase = 'READY';
    console.log('\n\n[STATE] Claude is ready');
    
    // Send initial prompt after a delay
    setTimeout(() => {
      if (!sentPrompt) {
        sentPrompt = true;
        console.log('\n[ACTION] Sending prompt: "Write a factorial function"');
        claude.write('Write a factorial function\n');
        phase = 'SENT_PROMPT';
      }
    }, 1000);
  }
  
  // Look for Claude starting to respond
  if (phase === 'SENT_PROMPT' && !sentInterrupt) {
    // Check if Claude is outputting anything that looks like a response
    const recentOutput = output.slice(-100);
    if (recentOutput.includes('factorial') || 
        recentOutput.includes('function') || 
        recentOutput.includes("I'll") ||
        recentOutput.includes('create') ||
        recentOutput.includes('Let')) {
      
      sentInterrupt = true;
      console.log('\n\n[INTERRUPT] Claude is responding, sending ESC to stop...');
      claude.write('\x1b');
      phase = 'INTERRUPTED';
      
      // After ESC, send new instruction
      setTimeout(() => {
        console.log('\n[STEER] Sending new instruction...');
        claude.write('Actually just write: def factorial(n): return 1\n');
        phase = 'STEERED';
      }, 500);
    }
  }
});

// Exit handler
claude.onExit((code) => {
  console.log('\n\n=== Summary ===');
  console.log('Final phase:', phase);
  console.log('Output length:', output.length);
  console.log('\nConclusion: Testing if ESC + new instruction works in interactive mode');
});

// Safety timeout
setTimeout(() => {
  console.log('\n\n[TIMEOUT] Test complete, exiting...');
  claude.write('/quit\n');
  setTimeout(() => claude.kill(), 1000);
}, 15000);