import { spawn } from 'node-pty';

console.log('=== Testing Claude Ctrl+Enter Success ===');
console.log('Using Ctrl+Enter (\\x0d) to submit\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let buffer = '';
let ready = false;

// Kill after 30 seconds for this focused test
const killTimer = setTimeout(() => {
  console.log('\n[TIMEOUT] 30 seconds reached, killing...');
  claude.kill();
  process.exit(1);
}, 30000);

claude.onData((data) => {
  buffer += data;
  process.stdout.write(data);
  
  // Wait for ready
  if (!ready && buffer.includes('? for shortcuts')) {
    ready = true;
    console.log('\n[READY] Claude UI ready');
    
    setTimeout(() => {
      console.log('\n[ACTION] Typing: print("AXIOM WORKS")');
      claude.write('print("AXIOM WORKS")');
      
      setTimeout(() => {
        console.log('[SUBMIT] Sending Ctrl+Enter (\\x0d)...');
        claude.write('\x0d');
      }, 500);
    }, 1000);
  }
  
  // Look for processing indicators
  if (data.includes('Smooshing') || data.includes('Forging') || data.includes('Actioning')) {
    console.log('\n[SUCCESS] Claude is processing!');
    
    // Now try to interrupt with ESC
    setTimeout(() => {
      console.log('\n[INTERRUPT] Sending ESC to stop Claude...');
      claude.write('\x1b');
      
      setTimeout(() => {
        console.log('[STEER] Sending new instruction...');
        claude.write('Actually just print("STEERING WORKS")\n');
      }, 500);
    }, 2000);
  }
  
  // Look for output
  if (buffer.includes('```python') || buffer.includes('AXIOM') || buffer.includes('STEERING')) {
    console.log('\n[OUTPUT] Code detected!');
    clearTimeout(killTimer);
    setTimeout(() => {
      claude.write('/quit\n');
    }, 2000);
  }
});

claude.onExit(() => {
  console.log('\n\n=== Summary ===');
  console.log('Ctrl+Enter works:', buffer.includes('Smooshing') || buffer.includes('Actioning'));
  console.log('Contains AXIOM:', buffer.includes('AXIOM'));
  console.log('Contains STEERING:', buffer.includes('STEERING'));
  clearTimeout(killTimer);
  process.exit(0);
});