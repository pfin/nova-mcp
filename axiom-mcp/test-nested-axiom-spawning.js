#!/usr/bin/env node
/**
 * Test script to demonstrate nested axiom spawning
 * Shows how an axiom doing research can spawn sub-axioms for implementation
 */

import { spawn } from 'node-pty';
import { logDebug } from './dist-v4/core/simple-logger.js';

// Simulate an Axiom research task that spawns sub-tasks
async function testNestedAxiomSpawning() {
  console.log('Testing Nested Axiom Spawning\n');
  console.log('Research Task: Factorial implementations in multiple languages\n');
  
  // Main research axiom
  const researchAxiom = {
    taskId: 'research-001',
    prompt: 'Research factorial implementations',
    startTime: Date.now(),
    status: 'running',
    output: ''
  };
  
  // Simulate research phase
  console.log('[research-001] Starting research on factorial implementations...');
  console.log('[research-001] Analyzing different approaches: recursive, iterative, memoized...');
  
  // After 30 seconds of research, spawn implementation tasks
  setTimeout(() => {
    console.log('\n[research-001] Research insights gathered. Spawning implementation tasks...\n');
    
    // Spawn Python implementation
    console.log('[research-001] Calling axiom_spawn for Python implementation...');
    const pythonTask = {
      taskId: 'impl-python-001',
      prompt: 'Implement factorial.py with recursive and iterative versions based on research findings',
      parentTaskId: 'research-001',
      startTime: Date.now()
    };
    console.log(`[${pythonTask.taskId}] Python implementation task started`);
    
    // Spawn JavaScript implementation
    console.log('\n[research-001] Calling axiom_spawn for JavaScript implementation...');
    const jsTask = {
      taskId: 'impl-js-001', 
      prompt: 'Implement factorial.js with memoization based on research findings',
      parentTaskId: 'research-001',
      startTime: Date.now()
    };
    console.log(`[${jsTask.taskId}] JavaScript implementation task started`);
    
    // Spawn Java implementation
    console.log('\n[research-001] Calling axiom_spawn for Java implementation...');
    const javaTask = {
      taskId: 'impl-java-001',
      prompt: 'Implement Factorial.java with BigInteger support based on research findings',
      parentTaskId: 'research-001',
      startTime: Date.now()
    };
    console.log(`[${javaTask.taskId}] Java implementation task started`);
    
    // Show parallel execution
    console.log('\n=== PARALLEL EXECUTION ===');
    console.log('[impl-python-001] Creating factorial.py...');
    console.log('[impl-js-001] Creating factorial.js...');
    console.log('[impl-java-001] Creating Factorial.java...');
    
    // Simulate file creation
    setTimeout(() => {
      console.log('\n=== FILES CREATED ===');
      console.log('[impl-python-001] ✓ factorial.py created');
      console.log('[impl-js-001] ✓ factorial.js created');
      console.log('[impl-java-001] ✓ Factorial.java created');
      
      console.log('\n[research-001] All implementation tasks completed!');
    }, 2000);
    
  }, 3000);
  
  // Show research time warning
  setTimeout(() => {
    console.log('\n[WARNING] Research time limit approaching! 1.25 minutes remaining.');
    console.log('Start documenting key findings now...');
    console.log('You can spawn sub-tasks with axiom_spawn for implementation while continuing research.');
  }, 3750); // At 75% of 5 minute limit
}

// Test the hook integration
async function testHookBehavior() {
  console.log('\n\n=== TESTING HOOK BEHAVIOR ===\n');
  
  // Show how META-AXIOM learns
  console.log('META-AXIOM Pattern Learning:');
  console.log('- Detected pattern: "research" prompts often succeed when they spawn sub-tasks');
  console.log('- Detected pattern: Pure research without implementation tends to fail');
  console.log('- Blocking pattern: "analyze the best way" without concrete deliverables');
  
  // Show how RESEARCH-AXIOM enforces limits
  console.log('\nRESEARCH-AXIOM Time Boxing:');
  console.log('- Research allowed for 5 minutes (configurable)');
  console.log('- Warning at 3.75 minutes (75% of time)');
  console.log('- Forced implementation at 5 minutes');
  console.log('- Extracts insights and converts to tasks');
  
  // Show task monitoring
  console.log('\nTASK-MONITOR Every 15 Seconds:');
  console.log('- Check 1 (15s): All tasks producing output ✓');
  console.log('- Check 2 (30s): Research spawned 3 sub-tasks ✓');
  console.log('- Check 3 (45s): Implementation tasks creating files ✓');
}

// Run tests
testNestedAxiomSpawning();
setTimeout(testHookBehavior, 6000);

// Example of what the actual MCP call would look like
console.log('\n\n=== ACTUAL MCP USAGE ===\n');
console.log(`axiom_spawn({
  prompt: "Research factorial implementations in Python, JavaScript, and Java. Use axiom_spawn to create implementation tasks.",
  researchTimeLimit: 300000, // 5 minutes
  verboseMasterMode: true
});`);

console.log('\nDuring execution, the research task can call:');
console.log(`axiom_spawn({
  prompt: "Implement factorial.py with recursive and iterative versions",
  spawnPattern: "single"
});`);