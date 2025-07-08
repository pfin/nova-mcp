#!/usr/bin/env node

import { CommandExecutor } from './dist-v4/executors/command-executor.js';

async function test() {
  console.log('Testing CommandExecutor...');
  
  const executor = new CommandExecutor({
    enableMonitoring: true
  });
  
  executor.on('data', (data) => {
    console.log('Output:', data);
  });
  
  try {
    const result = await executor.execute(
      'Create hello.py with print("Hello World")',
      '',
      'test-123'
    );
    console.log('Execution complete. Total output length:', result.length);
  } catch (err) {
    console.error('Execution failed:', err);
  }
}

test().catch(console.error);