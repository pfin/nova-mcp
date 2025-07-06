/**
 * Sprint 0 Test - Verify PTY executor works without timeout
 * 
 * Success criteria:
 * - PTY executor streams output in real-time
 * - No 30-second timeout errors  
 * - Events written to JSONL file
 * - Can see Claude's output character by character
 */

import { PtyExecutor } from './executors/pty-executor.js';
import { EventBus, EventType } from './core/event-bus.js';

async function testPtyExecution() {
  console.log('=== Sprint 0 Test: PTY Executor ===\n');
  
  // Initialize event bus
  const bus = new EventBus({ logDir: './logs-v2' });
  const taskLogger = bus.createTaskLogger('test-sprint0-001', 'main');
  
  // Log test start
  taskLogger.start({ 
    description: 'Testing PTY executor with simple Python task' 
  });
  
  // Create PTY executor
  const executor = new PtyExecutor({
    cwd: process.cwd(),
    heartbeatInterval: 180_000 // 3 minutes
  });
  
  // Track output
  let outputChunks = 0;
  let totalOutput = '';
  
  // Set up event handlers
  executor.on('data', (event: any) => {
    outputChunks++;
    totalOutput += event.payload;
    
    // Log to event bus
    bus.logEvent({
      taskId: event.taskId,
      workerId: 'main',
      event: EventType.CLAUDE_STDOUT,
      payload: event.payload
    });
    
    // Show real-time output
    process.stdout.write(event.payload);
  });
  
  executor.on('heartbeat', (event: any) => {
    console.log('\n[HEARTBEAT] Keepalive sent to prevent timeout');
    taskLogger.log(EventType.HEARTBEAT, event.payload);
  });
  
  executor.on('error', (event: any) => {
    console.error('\n[ERROR]', event.payload);
    taskLogger.fail(event.payload);
  });
  
  executor.on('exit', (event: any) => {
    console.log('\n[EXIT] Process terminated:', event.payload);
    taskLogger.complete({
      exitCode: event.payload.exitCode,
      outputChunks,
      totalLength: totalOutput.length
    });
  });
  
  // Execute task
  console.log('Starting Claude with PTY...\n');
  const startTime = Date.now();
  
  try {
    await executor.execute('claude', [
      '--dangerously-skip-permissions',
      '-p', 'Write a simple hello world Python script that prints "Hello from Axiom MCP v2!" and save it to hello_v2.py'
    ], 'test-sprint0-001');
    
    // Wait for completion
    await new Promise<void>((resolve) => {
      executor.on('exit', () => resolve());
    });
    
    const duration = Date.now() - startTime;
    
    // Check results
    console.log('\n\n=== Test Results ===');
    console.log(`Duration: ${duration}ms`);
    console.log(`Output chunks received: ${outputChunks}`);
    console.log(`Total output length: ${totalOutput.length} characters`);
    console.log(`Timeout occurred: ${duration > 30000 ? 'YES (FAILED)' : 'NO (SUCCESS)'}`);
    
    // Check if file was created
    const fs = await import('fs');
    const fileExists = fs.existsSync('hello_v2.py');
    console.log(`File created: ${fileExists ? 'YES' : 'NO'}`);
    
    if (fileExists) {
      const content = fs.readFileSync('hello_v2.py', 'utf-8');
      console.log('\nFile content:');
      console.log(content);
    }
    
    // Log final results
    taskLogger.verification({
      passed: duration < 30000 && fileExists,
      checks: {
        filesCreated: fileExists,
        testsPass: false, // Not testing execution
        coverageMet: false, // N/A
        noVulnerabilities: true, // Simple script
        actuallyRuns: false // Not testing execution
      },
      details: `Task completed in ${duration}ms`
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    taskLogger.fail(error);
  } finally {
    // Clean up
    executor.kill();
    await bus.close();
  }
}

// Run test
testPtyExecution().catch(console.error);