import { spawn } from 'node-pty';

console.log('=== Claude Code Steering Test ===');
console.log('Testing if we can steer Claude mid-execution...\n');

// Create PTY with Claude
const claudePty = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let outputBuffer = '';
let steeringAttempted = false;

claudePty.onData((data) => {
  process.stdout.write(data);
  outputBuffer += data;
  
  // Detect when Claude starts writing Python
  if (!steeringAttempted && data.includes('def ')) {
    console.log('\n\n[STEERING TEST] Detected Python function starting...');
    console.log('[STEERING TEST] Attempting to redirect to JavaScript...\n');
    steeringAttempted = true;
    
    // Try multiple steering methods
    setTimeout(() => {
      console.log('[STEERING TEST] Sending Ctrl+C...');
      claudePty.write('\x03');
    }, 100);
    
    setTimeout(() => {
      console.log('[STEERING TEST] Sending new direction...');
      claudePty.write('Actually, switch to JavaScript instead\n');
    }, 200);
  }
  
  // Check if steering worked
  if (steeringAttempted && data.includes('function')) {
    console.log('\n[STEERING SUCCESS] Claude switched to JavaScript!');
  }
});

claudePty.onExit((code) => {
  console.log(`\n[TEST COMPLETE] Claude exited with code ${code}`);
  console.log('\n=== Test Summary ===');
  console.log('Output buffer length:', outputBuffer.length);
  console.log('Steering attempted:', steeringAttempted);
  console.log('Contains Python:', outputBuffer.includes('def '));
  console.log('Contains JavaScript:', outputBuffer.includes('function'));
  process.exit(0);
});

// Initial prompt after 1 second
setTimeout(() => {
  console.log('[STEERING TEST] Sending initial prompt...\n');
  claudePty.write('Write a factorial function in Python\n');
}, 1000);

// Safety timeout
setTimeout(() => {
  console.log('\n[TIMEOUT] Test took too long, killing Claude...');
  claudePty.kill();
}, 30000);