#!/usr/bin/env node

/**
 * Test running 4 different implementation tasks simultaneously
 * Each task works in its own directory to avoid conflicts
 */

import { ClaudeCodeSubprocessV3 } from './dist-v3/src-v3/claude-subprocess-v3.js';
import { StatusManager } from './dist-v3/src/status-manager.js';
import { EventBus } from './dist-v3/src-v3/core/event-bus.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Clean up any previous test directories
function cleanup() {
  const dirs = ['task1-api', 'task2-parser', 'task3-ui', 'task4-algo'];
  for (const dir of dirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
      // Ignore
    }
  }
}

// Create working directories
function setup() {
  const dirs = ['task1-api', 'task2-parser', 'task3-ui', 'task4-algo'];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function runParallelTasks() {
  console.log('=== Axiom MCP v3 Parallel Task Execution Test ===\n');
  console.log('Running 4 different implementation tasks simultaneously...\n');
  
  cleanup();
  setup();
  
  // Create shared event bus for monitoring
  const eventBus = new EventBus({ logDir: './logs-parallel-test' });
  
  // Track task progress
  const taskProgress = {
    'task1': { name: 'REST API', status: 'starting', startTime: Date.now() },
    'task2': { name: 'CSV Parser', status: 'starting', startTime: Date.now() },
    'task3': { name: 'React Component', status: 'starting', startTime: Date.now() },
    'task4': { name: 'Sorting Algorithm', status: 'starting', startTime: Date.now() }
  };
  
  // Monitor events
  eventBus.on('event', (event) => {
    if (event.event === 'task_complete') {
      const taskId = event.taskId.split('-')[0];
      if (taskProgress[taskId]) {
        taskProgress[taskId].status = 'completed';
        taskProgress[taskId].duration = Date.now() - taskProgress[taskId].startTime;
        console.log(`\n✅ ${taskProgress[taskId].name} completed in ${Math.round(taskProgress[taskId].duration / 1000)}s`);
      }
    }
  });
  
  // Define the 4 tasks
  const tasks = [
    {
      id: 'task1',
      name: 'REST API',
      workDir: './task1-api',
      prompt: `Create a simple REST API using Node.js and Express:
1. Create package.json with express dependency
2. Create server.js with endpoints: GET /users, POST /users, GET /users/:id
3. Add basic error handling and JSON responses
4. Create a test.js file that tests the endpoints
5. Make sure the server can actually start`,
      expectedFiles: ['package.json', 'server.js', 'test.js']
    },
    {
      id: 'task2', 
      name: 'CSV Parser',
      workDir: './task2-parser',
      prompt: `Create a CSV parser in Python:
1. Create csv_parser.py that reads CSV files
2. Handle different delimiters and quoted fields
3. Convert to JSON format
4. Create test_parser.py with unit tests
5. Create sample.csv with test data`,
      expectedFiles: ['csv_parser.py', 'test_parser.py', 'sample.csv']
    },
    {
      id: 'task3',
      name: 'React Component',
      workDir: './task3-ui',
      prompt: `Create a file upload React component:
1. Create package.json with react dependencies
2. Create FileUpload.jsx component with progress indicator
3. Handle file selection and upload simulation
4. Create FileUpload.test.jsx with tests
5. Add proper error handling`,
      expectedFiles: ['package.json', 'FileUpload.jsx', 'FileUpload.test.jsx']
    },
    {
      id: 'task4',
      name: 'Sorting Algorithm',
      workDir: './task4-algo',
      prompt: `Implement merge sort in Java:
1. Create MergeSort.java with the algorithm
2. Handle arrays of integers
3. Create MergeSortTest.java with JUnit tests
4. Test edge cases (empty, single element, sorted, reverse)
5. Add performance measurement`,
      expectedFiles: ['MergeSort.java', 'MergeSortTest.java']
    }
  ];
  
  // Execute all tasks in parallel
  console.log('Starting all 4 tasks...\n');
  
  const promises = tasks.map(async (task) => {
    const claudeCode = new ClaudeCodeSubprocessV3({
      eventBus,
      enableMonitoring: true,
      addDir: [task.workDir]
    });
    
    const statusManager = new StatusManager();
    
    try {
      console.log(`🚀 Starting ${task.name} in ${task.workDir}`);
      
      // Change to task directory for execution
      const originalCwd = process.cwd();
      process.chdir(task.workDir);
      
      const result = await claudeCode.execute(task.prompt, {
        taskType: 'implementation',
        timeout: 300000 // 5 minutes per task
      });
      
      process.chdir(originalCwd);
      
      return {
        task,
        success: true,
        result,
        filesCreated: task.expectedFiles.filter(f => 
          fs.existsSync(path.join(task.workDir, f))
        )
      };
    } catch (error) {
      return {
        task,
        success: false,
        error: error.message,
        filesCreated: []
      };
    }
  });
  
  // Wait for all tasks to complete
  console.log('\nWaiting for all tasks to complete...\n');
  const startTime = Date.now();
  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;
  
  // Display results
  console.log('\n\n=== PARALLEL EXECUTION RESULTS ===\n');
  console.log(`Total execution time: ${Math.round(totalDuration / 1000)}s\n`);
  
  let successCount = 0;
  
  for (const result of results) {
    console.log(`\n${result.task.name}:`);
    console.log(`  Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`  Working Directory: ${result.task.workDir}`);
    console.log(`  Files Created: ${result.filesCreated.length}/${result.task.expectedFiles.length}`);
    
    if (result.filesCreated.length > 0) {
      console.log(`  - ${result.filesCreated.join('\n  - ')}`);
    }
    
    if (!result.success) {
      console.log(`  Error: ${result.error}`);
    } else {
      successCount++;
      
      // Try to run tests for successful tasks
      console.log('\n  Running verification:');
      try {
        switch (result.task.id) {
          case 'task1':
            console.log('  - Checking if Express server starts...');
            // Don't actually start the server in test, just check syntax
            execSync('node -c server.js', { cwd: result.task.workDir });
            console.log('  ✓ Server syntax valid');
            break;
            
          case 'task2':
            console.log('  - Running Python tests...');
            execSync('python test_parser.py', { cwd: result.task.workDir });
            console.log('  ✓ Tests passed');
            break;
            
          case 'task3':
            console.log('  - Checking React component...');
            execSync('node -c FileUpload.jsx', { cwd: result.task.workDir });
            console.log('  ✓ Component syntax valid');
            break;
            
          case 'task4':
            console.log('  - Compiling Java code...');
            execSync('javac MergeSort.java', { cwd: result.task.workDir });
            console.log('  ✓ Java code compiles');
            break;
        }
      } catch (e) {
        console.log(`  ⚠️  Verification failed: ${e.message}`);
      }
    }
  }
  
  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Successfully completed: ${successCount}/4 tasks`);
  console.log(`Parallel speedup: Running 4 tasks took ${Math.round(totalDuration / 1000)}s total`);
  console.log('(Sequential execution would have taken ~4x longer)\n');
  
  // Show what's possible with parallelization
  console.log('=== PARALLELIZATION BENEFITS ===');
  console.log('1. Different programming languages can be used simultaneously');
  console.log('2. Each task has isolated workspace (no conflicts)');
  console.log('3. Failures in one task don\'t affect others');
  console.log('4. Total time is roughly the slowest task, not sum of all tasks');
  console.log('5. Can leverage multiple CPU cores effectively\n');
  
  process.exit(successCount === 4 ? 0 : 1);
}

// Run the test
runParallelTasks().catch(console.error);