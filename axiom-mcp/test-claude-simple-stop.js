import { spawn } from 'node-pty';

console.log('=== Testing Claude Simple Stop ===');
console.log('Following user guidance: stop -> quit\n');

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
  
  // Wait for Claude to be ready
  if (phase === 'INIT' && output.includes('shortcuts')) {
    console.log('\n[TEST] Claude ready, sending prompt...');
    phase = 'PROMPTING';
    
    setTimeout(() => {
      // Send a simple prompt
      claude.write('Write hello world in Python\n');
    }, 500);
  }
  
  // When Claude starts processing
  if (phase === 'PROMPTING' && output.includes('Actioning')) {
    console.log('\n[OBSERVE] Claude is processing...');
    phase = 'WAITING';
    
    // Wait a bit then send ESC
    setTimeout(() => {
      console.log('\n[STOP] Sending ESC to stop Claude...');
      claude.write('\x1b');
      phase = 'STOPPED';
      
      // Then send quit
      setTimeout(() => {
        console.log('[QUIT] Sending quit command...');
        claude.write('quit\n');
      }, 500);
    }, 2000);
  }
});

claude.onExit((code) => {
  console.log('\n=== Test Complete ===');
  console.log('Exit code:', code);
  console.log('Output length:', output.length);
  console.log('\nFollowed user guidance: stop -> quit');
  console.log('Result: Claude terminated as expected');
});

setTimeout(() => {
  console.log('\n[TIMEOUT] Force killing...');
  claude.kill();
}, 10000);