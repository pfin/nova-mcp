import { spawn } from 'node-pty';

console.log('=== Testing Claude Modes ===\n');

// Test 1: Non-interactive mode with direct prompt
console.log('Test 1: Direct prompt mode (claude "prompt")');
const test1 = spawn('claude', ['Write a hello world in Python'], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let test1Output = '';
test1.onData((data) => {
  process.stdout.write(data);
  test1Output += data;
});

test1.onExit(() => {
  console.log('\n--- Test 1 Complete ---');
  console.log('Output length:', test1Output.length);
  console.log('Contains code:', test1Output.includes('print'));
  
  // Test 2: Try with a pipe
  console.log('\n\nTest 2: Testing with echo pipe');
  const test2 = spawn('bash', ['-c', 'echo "Write hello world" | claude'], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
  });
  
  let test2Output = '';
  test2.onData((data) => {
    process.stdout.write(data);
    test2Output += data;
  });
  
  test2.onExit(() => {
    console.log('\n--- Test 2 Complete ---');
    console.log('Output length:', test2Output.length);
    
    // Test 3: Interactive mode with immediate input
    console.log('\n\nTest 3: Interactive with immediate input');
    const test3 = spawn('claude', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env
    });
    
    // Send input immediately
    test3.write('Write hello world\n');
    
    let test3Output = '';
    test3.onData((data) => {
      process.stdout.write(data);
      test3Output += data;
      
      // Try to exit after some output
      if (test3Output.length > 1000) {
        test3.write('\x03\x03'); // Double Ctrl+C
        test3.write('exit\n');
      }
    });
    
    setTimeout(() => {
      console.log('\n--- All tests complete ---');
      test3.kill();
      process.exit(0);
    }, 10000);
  });
});