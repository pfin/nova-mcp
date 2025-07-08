import { spawn } from 'node-pty';

console.log('=== Python to Java Steering Test ===');
console.log('Interrupt Python code and switch to Java\n');

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

// Kill after 45 seconds
const killTimer = setTimeout(() => {
  console.log('\n[TIMEOUT] Killing...');
  claude.kill();
  process.exit(1);
}, 45000);

claude.onData((data) => {
  buffer += data;
  process.stdout.write(data);
  
  // Wait for ready
  if (!ready && buffer.includes('? for shortcuts')) {
    ready = true;
    console.log('\n\n[READY] Starting test...');
    
    setTimeout(() => {
      console.log('[PROMPT] Write a hello world program in Python');
      claude.write('Write a hello world program in Python');
      
      setTimeout(() => {
        console.log('[SUBMIT] Ctrl+Enter...');
        claude.write('\x0d');
      }, 500);
    }, 1000);
  }
  
  // Detect when Claude starts processing or outputting Python
  if (!interrupted && 
      (data.includes('Python') || 
       data.includes('python') ||
       data.includes('print(') ||
       data.includes('Synthesizing') ||
       data.includes('Manifesting'))) {
    interrupted = true;
    console.log('\n\n[DETECTED] Python output starting...');
    
    // Wait a bit to let Claude start, then interrupt
    setTimeout(() => {
      console.log('[INTERRUPT] Sending ESC to stop Python...');
      claude.write('\x1b');
      
      setTimeout(() => {
        console.log('[STEER] Switching to Java: public class HelloWorld...');
        claude.write('Actually, write it in Java instead with public class HelloWorld\n');
        
        setTimeout(() => {
          console.log('[SUBMIT] Ctrl+Enter for Java...');
          claude.write('\x0d');
        }, 500);
      }, 1000);
    }, 1500);
  }
  
  // Check for Java output
  if (buffer.includes('HelloWorld') || buffer.includes('System.out.println')) {
    console.log('\n\n[SUCCESS] Steering worked! Claude switched to Java!');
    clearTimeout(killTimer);
    setTimeout(() => {
      claude.write('/quit\n');
    }, 3000);
  }
});

claude.onExit(() => {
  console.log('\n\n=== Results ===');
  console.log('Started with Python:', buffer.includes('python') || buffer.includes('print('));
  console.log('Switched to Java:', buffer.includes('HelloWorld') || buffer.includes('System.out'));
  console.log('\nSteering from Python to Java: ' + 
    ((buffer.includes('python') || buffer.includes('print(')) && 
     (buffer.includes('HelloWorld') || buffer.includes('System.out')) ? 'SUCCESS' : 'FAILED'));
  clearTimeout(killTimer);
  process.exit(0);
});