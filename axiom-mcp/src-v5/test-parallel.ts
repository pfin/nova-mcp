/**
 * Test script for Parallel Executor
 */

import { ParallelExecutor, TaskDecomposer, ParallelTask } from './index.js';

async function testParallelExecution() {
  console.log('Testing Axiom v5 Parallel Executor...\n');
  
  // Create sample tasks
  const tasks: ParallelTask[] = [
    {
      id: 'task-1',
      prompt: 'Create a simple Node.js HTTP server in server.js that responds with "Hello from task 1"',
      priority: 1,
      status: 'pending',
      outputLines: 0,
      lastActivity: Date.now(),
      filesCreated: []
    },
    {
      id: 'task-2', 
      prompt: 'Create a Python script in hello.py that prints "Hello from task 2" and the current time',
      priority: 1,
      status: 'pending',
      outputLines: 0,
      lastActivity: Date.now(),
      filesCreated: []
    },
    {
      id: 'task-3',
      prompt: 'Create a bash script in greet.sh that echoes "Hello from task 3" and lists files in the directory',
      priority: 1,
      status: 'pending',
      outputLines: 0,
      lastActivity: Date.now(),
      filesCreated: []
    }
  ];
  
  // Create executor with aggressive settings
  const executor = new ParallelExecutor({
    maxInstances: 3,
    workspaceRoot: '/tmp/axiom-parallel-test',
    killIdleAfterMs: 20000, // 20 seconds
    killUnproductiveAfterMs: 60000, // 1 minute
    minProductivityScore: 10,
    enableAggressiveKilling: true
  });
  
  // Monitor progress
  executor.on('progress', (data) => {
    console.log(`[${data.instanceId}] Task ${data.taskId}: ${data.data.trim()}`);
  });
  
  // Status monitoring
  const statusInterval = setInterval(() => {
    const status = executor.getStatus();
    console.log('\n=== STATUS UPDATE ===');
    console.log(`Running: ${status.running}, Completed: ${status.completed}, Failed: ${status.failed}`);
    console.log('Instances:', status.instances.map((i: any) => 
      `${i.id}: ${i.status} (score: ${i.productivityScore}, files: ${i.filesCreated})`
    ).join('\n'));
    console.log('====================\n');
  }, 10000);
  
  try {
    console.log('Starting parallel execution...\n');
    const results = await executor.execute(tasks);
    
    console.log('\n=== EXECUTION COMPLETE ===');
    console.log(`Total tasks: ${tasks.length}`);
    console.log(`Completed: ${results.size}`);
    
    for (const [taskId, result] of results) {
      console.log(`\nTask ${taskId} result:`);
      console.log(result.slice(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('Execution failed:', error);
  } finally {
    clearInterval(statusInterval);
    await executor.shutdown();
  }
}

// Test task decomposition
function testDecomposition() {
  console.log('\nTesting Task Decomposition...\n');
  
  const complexPrompt = `Build a complete REST API for a todo list application with the following features:
  1. CRUD operations for todos
  2. User authentication with JWT
  3. Database persistence with SQLite
  4. Input validation
  5. Error handling
  6. API documentation`;
  
  const tasks = TaskDecomposer.decompose(complexPrompt, 'orthogonal');
  
  console.log(`Decomposed into ${tasks.length} tasks:`);
  tasks.forEach((task, i) => {
    console.log(`\nTask ${i + 1} (${task.id}):`);
    console.log(task.prompt.slice(0, 100) + '...');
  });
}

// Run tests
async function main() {
  testDecomposition();
  // Uncomment to test actual parallel execution (requires Claude CLI)
  // await testParallelExecution();
}

main().catch(console.error);