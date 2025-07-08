import { spawn } from 'node-pty';

console.log('=== Claude Fast Interrupt Test ===');
console.log('Interrupt as soon as processing starts\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let buffer = '';
let ready = false;
let interrupted = false;

// Kill after 30 seconds
const killTimer = setTimeout(() => {
  console.log('\n[TIMEOUT] Killing...');
  claude.kill();
  process.exit(1);
}, 30000);

claude.onData((data) => {
  buffer += data;
  process.stdout.write(data);
  
  // Wait for ready
  if (!ready && buffer.includes('? for shortcuts')) {
    ready = true;
    console.log('\n\n[READY] Claude UI ready');
    
    setTimeout(() => {
      console.log('[TYPE] Write a very long detailed explanation about Python');
      claude.write('Write a very long detailed explanation about Python');
      
      setTimeout(() => {
        console.log('[SUBMIT] Ctrl+Enter...');
        claude.write('\x0d');
      }, 500);
    }, 1000);
  }
  
  // Interrupt IMMEDIATELY when we see any processing indicator
  if (!interrupted && 
      (data.includes('Manifesting') || 
       data.includes('Synthesizing') ||
       data.includes('Forging') ||
       data.includes('Smooshing') ||
       data.includes('↓') ||
       data.includes('↑'))) {
    interrupted = true;
    console.log('\n\n[INTERRUPT] Processing detected! Sending ESC immediately...');
    claude.write('\x1b');
    
    setTimeout(() => {
      console.log('[STEER] New instruction: Just print("AXIOM INTERRUPTED")');
      claude.write('Just print("AXIOM INTERRUPTED")\n');
      
      setTimeout(() => {
        console.log('[SUBMIT] Ctrl+Enter for new instruction...');
        claude.write('\x0d');
      }, 500);
    }, 1000);
  }
  
  // Check for success
  if (buffer.includes('AXIOM INTERRUPTED')) {
    console.log('\n\n[SUCCESS] Interruption and steering worked!');
    clearTimeout(killTimer);
    setTimeout(() => {
      claude.write('/quit\n');
    }, 2000);
  }
});

claude.onExit(() => {
  console.log('\n\n=== Test Complete ===');
  console.log('Interrupted:', interrupted);
  console.log('Contains AXIOM:', buffer.includes('AXIOM'));
  clearTimeout(killTimer);
  process.exit(0);
});