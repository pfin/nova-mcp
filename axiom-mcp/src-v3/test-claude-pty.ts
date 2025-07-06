/**
 * Test Claude CLI with PTY - Verify streaming and no timeout
 */

import { PtyExecutor } from './executors/pty-executor.js';
import * as path from 'path';

async function testClaudePty() {
  console.log('=== Claude PTY Test ===\n');
  
  const ptyExecutor = new PtyExecutor({
    cwd: process.cwd(),
    heartbeatInterval: 180_000 // 3 minutes
  });
  
  console.log('Creating PTY executor for Claude...');
  
  let output = '';
  let hasOutput = false;
  let tokenCount = 0;
  
  ptyExecutor.on('data', (event) => {
    if (event.type === 'data') {
      output += event.payload;
      if (!hasOutput) {
        console.log('✅ Receiving streamed output from Claude!');
        hasOutput = true;
      }
      // Count tokens (rough estimate)
      tokenCount++;
      // Show progress every 10 chunks
      if (tokenCount % 10 === 0) {
        process.stdout.write('.');
      }
    }
  });
  
  ptyExecutor.on('error', (event) => {
    console.error('❌ Error:', event.payload);
  });
  
  ptyExecutor.on('exit', (event) => {
    console.log(`\n✅ Claude process exited with code: ${event.payload.exitCode}`);
    console.log(`Total output length: ${output.length} characters`);
    console.log(`Streamed chunks: ${tokenCount}`);
    
    // Show first 200 chars of output
    console.log('\nFirst 200 chars of output:');
    console.log(output.substring(0, 200) + '...\n');
  });
  
  // Test prompt that would normally timeout
  const prompt = 'Write a simple Python function to calculate fibonacci numbers with detailed comments';
  
  console.log('Executing Claude via PTY...\n');
  console.log(`Prompt: "${prompt}"\n`);
  
  const startTime = Date.now();
  
  try {
    await ptyExecutor.execute(
      'claude',
      ['--dangerously-skip-permissions', '-p', prompt],
      'test-claude-pty'
    );
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ Test completed successfully in ${elapsed}ms!`);
    
    if (elapsed > 30000) {
      console.log('✅ Successfully ran longer than 30 seconds without timeout!');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testClaudePty().catch(console.error);