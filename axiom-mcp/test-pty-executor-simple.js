#!/usr/bin/env node

import { PtyExecutor } from './dist-v4/executors/pty-executor.js';

// Enable debug logging
process.env.AXIOM_LOG_LEVEL = 'DEBUG';

async function testPtyExecutor() {
  console.log('Testing PTY Executor with simple task...\n');
  
  const executor = new PtyExecutor({
    enableMonitoring: true
  });
  
  const prompt = 'Create a file called test-pty.txt with the content "PTY test successful!"';
  
  console.log('Prompt:', prompt);
  console.log('Expected typing time:', (prompt.length * 100 / 1000).toFixed(1) + 's');
  
  try {
    console.log('\nExecuting...');
    const startTime = Date.now();
    
    const result = await executor.execute(prompt);
    
    const elapsed = Date.now() - startTime;
    console.log(`\nExecution completed in ${(elapsed/1000).toFixed(1)}s`);
    console.log('Output length:', result.length);
    console.log('Output preview:', result.slice(0, 200).replace(/\n/g, '\\n'));
    
    // Check if file was created
    const fs = await import('fs');
    if (fs.existsSync('test-pty.txt')) {
      console.log('\n✓ File created successfully!');
      const content = fs.readFileSync('test-pty.txt', 'utf8');
      console.log('File content:', content);
    } else {
      console.log('\n✗ File was not created');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPtyExecutor().catch(console.error);