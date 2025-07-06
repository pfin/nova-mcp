#!/usr/bin/env node

/**
 * Direct test of v3 PTY execution
 */

import { PtyExecutor } from './dist-v3/src-v3/executors/pty-executor.js';

async function testDirectPty() {
  console.log('Testing PTY execution directly...\n');
  
  const executor = new PtyExecutor({
    cwd: process.cwd(),
    enableMonitoring: false,
    enableIntervention: false,
  });
  
  let output = '';
  
  executor.on('data', (event) => {
    if (event.type === 'data') {
      output += event.payload;
      process.stdout.write(event.payload);
    }
  });
  
  executor.on('exit', (event) => {
    console.log('\n\nExecution complete. Exit code:', event.payload.exitCode);
  });
  
  const prompt = `Write a simple JavaScript function that adds two numbers and save it to a file called add.js`;
  
  console.log('Prompt:', prompt);
  console.log('\nExecuting...\n');
  
  try {
    await executor.execute('claude', ['--print', prompt], 'test-123');
    console.log('\n\nTotal output length:', output.length);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    executor.cleanup();
  }
}

testDirectPty().catch(console.error);