import { spawn } from 'node-pty';
import { setTimeout } from 'timers/promises';

console.log('=== Testing Claude Direct Control ===\n');

async function testClaudeControl() {
  // Test 1: Try to use Claude in a more direct way
  console.log('Test: Attempting to send commands to Claude\n');
  
  const claude = spawn('claude', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
  });
  
  let output = '';
  let lastOutputTime = Date.now();
  
  claude.onData((data) => {
    output += data;
    lastOutputTime = Date.now();
    process.stdout.write(data);
  });
  
  // Wait for Claude to initialize
  await setTimeout(2000);
  
  console.log('\n[TEST] Sending initial prompt...');
  claude.write('print("Hello World")\n');
  
  await setTimeout(2000);
  
  console.log('\n[TEST] Trying Enter key...');
  claude.write('\r');
  
  await setTimeout(2000);
  
  console.log('\n[TEST] Trying Ctrl+Enter...');
  claude.write('\x0d');
  
  await setTimeout(2000);
  
  console.log('\n[TEST] Trying to exit...');
  claude.write('/exit\n');
  
  await setTimeout(1000);
  
  console.log('\n[TEST] Force killing...');
  claude.kill();
  
  // Analysis
  console.log('\n=== Analysis ===');
  console.log('Total output length:', output.length);
  console.log('Output contains prompt:', output.includes('print("Hello World")'));
  console.log('Output contains welcome:', output.includes('Welcome to Claude'));
  console.log('Output contains any code:', output.includes('```'));
  
  // Check if Claude is actually interactive
  if (output.includes('shortcuts') && !output.includes('```')) {
    console.log('\nCONCLUSION: Claude is stuck in interactive UI, not processing commands');
    console.log('We cannot steer Claude Code in its current form.');
  }
}

testClaudeControl().catch(console.error);