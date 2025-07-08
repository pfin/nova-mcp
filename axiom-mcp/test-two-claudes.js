import { spawn } from 'node-pty';

console.log('=== Managing Two Claude Instances ===');
console.log('Running two tasks in parallel\n');

// Spawn two Claude instances
const claude1 = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

const claude2 = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let claude1Ready = false;
let claude2Ready = false;
let claude1Buffer = '';
let claude2Buffer = '';

// Kill timer
const killTimer = setTimeout(() => {
  console.log('\n[TIMEOUT] Killing both instances...');
  claude1.kill();
  claude2.kill();
  process.exit(1);
}, 30000);

// Claude 1 handler
claude1.onData((data) => {
  claude1Buffer += data;
  // Prefix output with [C1]
  const lines = data.split('\n');
  lines.forEach((line, i) => {
    if (line.trim() || i < lines.length - 1) {
      console.log('[C1]', line);
    }
  });
  
  if (!claude1Ready && claude1Buffer.includes('? for shortcuts')) {
    claude1Ready = true;
    console.log('\n[C1] Ready!');
    checkBothReady();
  }
  
  // Detect if C1 starts writing Python
  if (claude1Buffer.includes('print(') || claude1Buffer.includes('Python')) {
    console.log('\n[C1] Python detected, interrupting...');
    claude1.write('\x1b'); // ESC
    setTimeout(() => {
      console.log('[C1] Steering to JavaScript...');
      claude1.write('Actually make it JavaScript: console.log("C1")\n');
      claude1.write('\x0d');
    }, 1000);
  }
});

// Claude 2 handler
claude2.onData((data) => {
  claude2Buffer += data;
  // Prefix output with [C2]
  const lines = data.split('\n');
  lines.forEach((line, i) => {
    if (line.trim() || i < lines.length - 1) {
      console.log('[C2]', line);
    }
  });
  
  if (!claude2Ready && claude2Buffer.includes('? for shortcuts')) {
    claude2Ready = true;
    console.log('\n[C2] Ready!');
    checkBothReady();
  }
  
  // Detect if C2 starts writing Python
  if (claude2Buffer.includes('def ') || claude2Buffer.includes('factorial')) {
    console.log('\n[C2] Factorial detected, interrupting...');
    claude2.write('\x1b'); // ESC
    setTimeout(() => {
      console.log('[C2] Steering to simple return...');
      claude2.write('Just write: def factorial(n): return 42\n');
      claude2.write('\x0d');
    }, 1000);
  }
});

// When both are ready, send different prompts
function checkBothReady() {
  if (claude1Ready && claude2Ready) {
    console.log('\n[BOTH] Both instances ready, sending prompts...\n');
    
    // Send different prompts
    setTimeout(() => {
      console.log('[C1] Prompt: Write hello world in Python');
      claude1.write('Write hello world in Python');
      claude1.write('\x0d');
    }, 500);
    
    setTimeout(() => {
      console.log('[C2] Prompt: Write a factorial function');
      claude2.write('Write a factorial function');
      claude2.write('\x0d');
    }, 1000);
  }
}

// Exit handlers
claude1.onExit(() => {
  console.log('\n[C1] Exited');
  claude2.kill();
  clearTimeout(killTimer);
});

claude2.onExit(() => {
  console.log('\n[C2] Exited');
  claude1.kill();
  clearTimeout(killTimer);
});

// Clean exit after 20 seconds
setTimeout(() => {
  console.log('\n[COMPLETE] Sending /quit to both...');
  claude1.write('/quit\n');
  claude2.write('/quit\n');
}, 20000);