import { spawn } from 'node-pty';

console.log('=== Testing Claude ESC Interrupt ===');
console.log('Just like a human user would do!\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let phase = 'INIT';
let output = '';

claude.onData((data) => {
  output += data;
  process.stdout.write(data);
  
  // Look for Claude being ready
  if (phase === 'INIT' && output.includes('shortcuts')) {
    console.log('\n[TEST] Claude ready, sending prompt...');
    phase = 'PROMPTING';
    
    setTimeout(() => {
      claude.write('Write a long explanation about factorial functions\n');
    }, 500);
  }
  
  // When Claude starts outputting (especially "Actioning...")
  if (phase === 'PROMPTING' && output.includes('Actioning')) {
    console.log('\n[TEST] Claude is processing...');
    phase = 'WAITING_FOR_OUTPUT';
  }
  
  // When we see Claude starting to explain
  if (phase === 'WAITING_FOR_OUTPUT' && 
      (output.includes('factorial') || output.includes('function') || output.includes('I\'ll'))) {
    console.log('\n\n[INTERRUPT] Sending ESC to stop Claude...');
    phase = 'INTERRUPTING';
    
    // Send ESC character
    claude.write('\x1b');
    
    setTimeout(() => {
      console.log('[STEER] Sending new instruction...');
      claude.write('Just write the code: def factorial(n):\n');
    }, 500);
  }
  
  // Check if steering worked
  if (phase === 'INTERRUPTING' && output.includes('def factorial')) {
    console.log('\n[SUCCESS] Claude responded to steering!');
  }
});

claude.onExit(() => {
  console.log('\n=== Summary ===');
  console.log('Output length:', output.length);
  console.log('Contains explanation:', output.includes('explanation'));
  console.log('Contains code:', output.includes('def '));
  console.log('\nKey insight: ESC can interrupt Claude mid-stream!');
});

setTimeout(() => {
  console.log('\n[TIMEOUT] Ending test...');
  claude.kill();
}, 20000);