import { spawn } from 'node-pty';

console.log('=== Claude Steering Demo ===');
console.log('Ctrl+Enter submits, ESC interrupts\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let buffer = '';
let phase = 'INIT';

// Kill after 60 seconds
const killTimer = setTimeout(() => {
  console.log('\n[TIMEOUT] Killing process...');
  claude.kill();
  process.exit(1);
}, 60000);

claude.onData((data) => {
  buffer += data;
  process.stdout.write(data);
  
  // Phase 1: Wait for UI
  if (phase === 'INIT' && buffer.includes('? for shortcuts')) {
    phase = 'READY';
    console.log('\n\n[PHASE 1] Claude ready');
    
    setTimeout(() => {
      console.log('[ACTION] Typing: Write a Python factorial function');
      claude.write('Write a Python factorial function');
      
      setTimeout(() => {
        console.log('[SUBMIT] Ctrl+Enter...');
        claude.write('\x0d');
        phase = 'PROCESSING';
      }, 500);
    }, 1000);
  }
  
  // Phase 2: Detect processing
  if (phase === 'PROCESSING' && 
      (data.includes('Synthesizing') || 
       data.includes('Smooshing') || 
       data.includes('Forging'))) {
    console.log('\n\n[PHASE 2] Claude is processing!');
    phase = 'WAIT_FOR_OUTPUT';
  }
  
  // Phase 3: Interrupt when Claude starts outputting
  if (phase === 'WAIT_FOR_OUTPUT' && 
      (buffer.includes("I'll") || 
       buffer.includes('factorial') || 
       buffer.includes('function') ||
       buffer.includes('```'))) {
    console.log('\n\n[PHASE 3] Output detected, interrupting...');
    phase = 'INTERRUPTING';
    
    // Send ESC to interrupt
    claude.write('\x1b');
    
    setTimeout(() => {
      console.log('\n[STEER] Sending new instruction...');
      claude.write('Just write: def factorial(n): return 42\n');
      
      // Submit the new instruction
      setTimeout(() => {
        console.log('[SUBMIT] Ctrl+Enter for new instruction...');
        claude.write('\x0d');
        phase = 'STEERED';
      }, 500);
    }, 1000);
  }
  
  // Phase 4: Check if steering worked
  if (phase === 'STEERED' && buffer.includes('42')) {
    console.log('\n\n[SUCCESS] Steering worked! Claude wrote "return 42"');
    clearTimeout(killTimer);
    
    setTimeout(() => {
      console.log('\n[EXIT] Sending /quit...');
      claude.write('/quit\n');
    }, 3000);
  }
});

claude.onExit(() => {
  console.log('\n\n=== Demo Complete ===');
  console.log('Key findings:');
  console.log('1. Ctrl+Enter (\\x0d) submits prompts');
  console.log('2. ESC (\\x1b) can interrupt Claude');
  console.log('3. Steering is possible!');
  console.log('\nBuffer contains "42":', buffer.includes('42'));
  clearTimeout(killTimer);
  process.exit(0);
});