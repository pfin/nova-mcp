import { spawn } from 'node-pty';

console.log('=== Testing Claude Keyboard Shortcuts ===');
console.log('Trying Ctrl combinations\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let buffer = '';
let testNum = 0;

// Kill after 2 minutes
const killTimer = setTimeout(() => {
  console.log('\n[TIMEOUT] 2 minutes reached, killing...');
  claude.kill();
  process.exit(1);
}, 120000);

claude.onData((data) => {
  buffer += data;
  process.stdout.write(data);
  
  // Detect signs of execution
  if (data.includes('Actioning') || data.includes('󰣐')) {
    console.log('\n\n[SUCCESS] Claude is processing! Test #' + testNum + ' worked!');
    clearTimeout(killTimer);
    setTimeout(() => {
      claude.write('/quit\n');
    }, 2000);
  }
});

// Test sequence
setTimeout(() => {
  console.log('\n[TEST 1] Type prompt and Ctrl+Enter...');
  testNum = 1;
  claude.write('print("test1")');
  setTimeout(() => {
    claude.write('\x0d'); // Ctrl+M (carriage return)
  }, 500);
}, 2000);

setTimeout(() => {
  if (buffer.includes('Actioning')) return;
  
  console.log('\n[TEST 2] Clear and try with Ctrl+J...');
  testNum = 2;
  claude.write('\x03'); // Ctrl+C to clear
  setTimeout(() => {
    claude.write('print("test2")');
    setTimeout(() => {
      claude.write('\x0a'); // Ctrl+J (line feed)
    }, 500);
  }, 500);
}, 5000);

setTimeout(() => {
  if (buffer.includes('Actioning')) return;
  
  console.log('\n[TEST 3] Try double Enter...');
  testNum = 3;
  claude.write('\x03'); // Clear
  setTimeout(() => {
    claude.write('print("test3")');
    setTimeout(() => {
      claude.write('\n\n');
    }, 500);
  }, 500);
}, 8000);

setTimeout(() => {
  if (buffer.includes('Actioning')) return;
  
  console.log('\n[TEST 4] Try Shift+Enter sequence...');
  testNum = 4;
  claude.write('\x03'); // Clear
  setTimeout(() => {
    claude.write('print("test4")');
    setTimeout(() => {
      // Send ESC sequence for Shift+Enter
      claude.write('\x1b[13;2u');
    }, 500);
  }, 500);
}, 11000);

setTimeout(() => {
  if (buffer.includes('Actioning')) return;
  
  console.log('\n[TEST 5] Try just typing and waiting...');
  testNum = 5;
  claude.write('\x03'); // Clear
  setTimeout(() => {
    claude.write('print("test5")\n');
    // Just wait - maybe it auto-submits?
  }, 500);
}, 14000);

claude.onExit(() => {
  console.log('\n=== Tests Complete ===');
  console.log('Success:', buffer.includes('Actioning'));
  clearTimeout(killTimer);
  process.exit(0);
});