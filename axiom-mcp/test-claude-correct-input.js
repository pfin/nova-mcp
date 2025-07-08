import { spawn } from 'node-pty';

console.log('=== Testing Claude Correct Input Method ===');
console.log('Sending input to the console correctly\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let output = '';
let ready = false;

claude.onData((data) => {
  output += data;
  process.stdout.write(data);
  
  // Detect when Claude is ready
  if (!ready && output.includes('? for shortcuts')) {
    ready = true;
    console.log('\n\n[READY] Claude is ready for input');
    
    // Send a simple command after a short delay
    setTimeout(() => {
      console.log('\n[INPUT] Typing: print("hello")');
      // Type the command character by character
      const command = 'print("hello")';
      for (const char of command) {
        claude.write(char);
      }
      
      // Then send Enter
      setTimeout(() => {
        console.log('\n[SUBMIT] Pressing Enter...');
        claude.write('\r\n');
      }, 500);
    }, 1000);
  }
  
  // Look for signs of execution
  if (data.includes('Actioning')) {
    console.log('\n[SUCCESS] Claude is actioning the request!');
  }
  
  if (data.includes('```')) {
    console.log('\n[SUCCESS] Code output detected!');
  }
});

// Monitor progress
setTimeout(() => {
  console.log('\n\n[CHECK] Current state:');
  console.log('- Output length:', output.length);
  console.log('- Contains "hello":', output.includes('hello'));
  console.log('- Contains code block:', output.includes('```'));
}, 10000);

// Clean exit
setTimeout(() => {
  console.log('\n[EXIT] Sending /quit...');
  claude.write('/quit\n');
}, 15000);

claude.onExit(() => {
  console.log('\n=== Complete ===');
});

setTimeout(() => {
  claude.kill();
}, 20000);