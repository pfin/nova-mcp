import { spawn } from 'node-pty';

console.log('=== Aggressive Claude Steering Test ===');
console.log('Testing various steering methods...\n');

const claudePty = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let phase = 'WAITING';
let outputBuffer = '';

claudePty.onData((data) => {
  process.stdout.write(data);
  outputBuffer += data;
  
  // More aggressive pattern detection
  if (phase === 'WAITING' && data.includes('? for shortcuts')) {
    console.log('\n[TEST] Claude ready, sending prompt...');
    phase = 'PROMPTING';
    setTimeout(() => {
      claudePty.write('Write a factorial function\n');
    }, 500);
  }
  
  // Look for any output that looks like code or planning
  if (phase === 'PROMPTING' && (
    data.includes('factorial') || 
    data.includes('function') ||
    data.includes('def ') ||
    data.includes('I\'ll') ||
    data.includes('Let me')
  )) {
    console.log('\n[INTERRUPT] Detected output, trying to steer...');
    phase = 'STEERING';
    
    // Try everything
    claudePty.write('\x03'); // Ctrl+C
    claudePty.write('\n\nSTOP! Change direction!\n');
    claudePty.write('Make it recursive in JavaScript instead\n');
  }
});

// Also try sending Enter key to submit prompt
setTimeout(() => {
  if (phase === 'PROMPTING') {
    console.log('[TEST] Sending Enter key...');
    claudePty.write('\r');
  }
}, 2000);

// Try more aggressive interrupts
setTimeout(() => {
  if (phase === 'PROMPTING' || phase === 'STEERING') {
    console.log('\n[TEST] Trying Ctrl+C...');
    claudePty.write('\x03');
    setTimeout(() => {
      console.log('[TEST] Sending new prompt...');
      claudePty.write('Just write console.log("Hello")\n');
    }, 100);
  }
}, 5000);

claudePty.onExit((code) => {
  console.log(`\n[COMPLETE] Claude exited`);
  console.log('Final phase:', phase);
  console.log('Output contains "factorial":', outputBuffer.includes('factorial'));
  console.log('Output contains code:', outputBuffer.includes('```'));
  process.exit(0);
});

setTimeout(() => {
  console.log('\n[TIMEOUT] Killing Claude...');
  claudePty.kill();
}, 15000);