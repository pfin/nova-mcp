import { spawn } from 'node-pty';

console.log('=== Testing Claude Multi-line Input ===');
console.log('Maybe we need multiple lines before submit\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let buffer = '';
let phase = 'INIT';

// Kill after 2 minutes
const killTimer = setTimeout(() => {
  console.log('\n[TIMEOUT] 2 minutes reached, killing process...');
  claude.kill();
  process.exit(1);
}, 120000);

claude.onData((data) => {
  buffer += data;
  process.stdout.write(data);
  
  // Detect when ready
  if (phase === 'INIT' && buffer.includes('? for shortcuts')) {
    phase = 'READY';
    console.log('\n[READY] Claude UI detected');
    
    setTimeout(() => {
      console.log('\n[TEST] Typing first line...');
      claude.write('print("hello world")');
      
      setTimeout(() => {
        console.log('[TEST] Moving to second line with Alt+Enter...');
        claude.write('\x1b\r');
        
        setTimeout(() => {
          console.log('[TEST] Typing on second line...');
          claude.write('# This is a comment');
          
          setTimeout(() => {
            console.log('[TEST] Now pressing Enter to submit...');
            claude.write('\n');
            phase = 'SUBMITTED';
          }, 500);
        }, 500);
      }, 500);
    }, 1000);
  }
  
  // Look for execution
  if (data.includes('Actioning')) {
    console.log('\n[SUCCESS] Claude is actioning!');
    clearTimeout(killTimer);
    setTimeout(() => {
      claude.write('/quit\n');
    }, 2000);
  }
});

claude.onExit(() => {
  console.log('\n=== Result ===');
  console.log('Phase:', phase);
  console.log('Success:', buffer.includes('Actioning') || buffer.includes('```'));
  clearTimeout(killTimer);
  process.exit(0);
});