/**
 * Basic PTY Test - Verify we can stream output from Claude
 */

import { PtyExecutor } from './executors/pty-executor.js';
import * as path from 'path';

async function testPtyBasic() {
  console.log('=== Basic PTY Test ===\n');
  
  const ptyExecutor = new PtyExecutor({
    cwd: process.cwd(),
    heartbeatInterval: 180_000 // 3 minutes
  });
  
  console.log('Creating PTY executor...');
  
  let output = '';
  let hasOutput = false;
  
  ptyExecutor.on('data', (event) => {
    if (event.type === 'data') {
      output += event.payload;
      if (!hasOutput) {
        console.log('✅ Receiving streamed output!');
        hasOutput = true;
      }
      // Print first 100 chars to verify streaming
      if (output.length <= 100) {
        process.stdout.write(event.payload);
      }
    }
  });
  
  ptyExecutor.on('error', (event) => {
    console.error('❌ Error:', event.payload);
  });
  
  ptyExecutor.on('exit', (event) => {
    console.log(`\n✅ Process exited with code: ${event.payload.exitCode}`);
    console.log(`Total output length: ${output.length} characters`);
  });
  
  // Simple test prompt
  const prompt = 'echo "Hello from PTY!" && echo "Streaming works!"';
  
  console.log('Executing command via PTY...\n');
  
  try {
    await ptyExecutor.execute(
      'bash',
      ['-c', prompt],
      'test-pty-basic'
    );
    
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPtyBasic().catch(console.error);