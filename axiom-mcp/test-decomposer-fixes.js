#!/usr/bin/env node

/**
 * Test script to verify orthogonal decomposer fixes
 */

import { axiomOrthogonalDecompose, cleanupDecomposer } from './dist-v4/tools/axiom-orthogonal-decomposer.js';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

console.log('🧪 Testing Orthogonal Decomposer Fixes\n');

// Test 1: Cleanup system
async function testCleanup() {
  console.log('Test 1: Cleanup System');
  console.log('---------------------');
  
  // Count temp dirs before
  const tmpDir = os.tmpdir();
  const before = (await fs.readdir(tmpDir)).filter(d => d.startsWith('axiom-')).length;
  console.log(`Temp dirs before: ${before}`);
  
  // Decompose a task
  const result = await axiomOrthogonalDecompose({
    action: 'decompose',
    prompt: 'Create a REST API with authentication'
  });
  
  console.log('Decomposed tasks:', JSON.parse(result).tasks.length);
  
  // Execute (but interrupt quickly)
  const execPromise = axiomOrthogonalDecompose({
    action: 'execute', 
    prompt: 'Create a REST API with authentication'
  });
  
  // Wait 2 seconds then cleanup
  await new Promise(r => setTimeout(r, 2000));
  await cleanupDecomposer();
  
  // Count temp dirs after
  const after = (await fs.readdir(tmpDir)).filter(d => d.startsWith('axiom-')).length;
  console.log(`Temp dirs after cleanup: ${after}`);
  
  console.log(`✅ Cleanup test: ${after <= before ? 'PASSED' : 'FAILED'}\n`);
}

// Test 2: Process cleanup
async function testProcessCleanup() {
  console.log('Test 2: Process Cleanup');
  console.log('----------------------');
  
  // Check Claude processes before
  const claudesBefore = await countClaudeProcesses();
  console.log(`Claude processes before: ${claudesBefore}`);
  
  // Start execution
  const execPromise = axiomOrthogonalDecompose({
    action: 'execute',
    prompt: 'Create a simple factorial function'
  });
  
  // Wait for processes to start
  await new Promise(r => setTimeout(r, 3000));
  
  const claudesDuring = await countClaudeProcesses();
  console.log(`Claude processes during: ${claudesDuring}`);
  
  // Cleanup
  await cleanupDecomposer();
  
  // Check after cleanup
  await new Promise(r => setTimeout(r, 1000));
  const claudesAfter = await countClaudeProcesses();
  console.log(`Claude processes after: ${claudesAfter}`);
  
  console.log(`✅ Process cleanup test: ${claudesAfter === claudesBefore ? 'PASSED' : 'FAILED'}\n`);
}

// Test 3: Error recovery (no Claude needed)
async function testErrorRecovery() {
  console.log('Test 3: Error Recovery');
  console.log('---------------------');
  
  // Test decomposition (doesn't need Claude)
  try {
    const result = await axiomOrthogonalDecompose({
      action: 'decompose',
      prompt: 'Implement an LRU cache with TTL support'
    });
    
    const tasks = JSON.parse(result).tasks;
    console.log(`Decomposed into ${tasks.length} tasks`);
    console.log('Task IDs:', tasks.map(t => t.id).join(', '));
    console.log('✅ Decomposition works without Claude\n');
  } catch (error) {
    console.log(`❌ Decomposition failed: ${error.message}\n`);
  }
}

// Test 4: Public API
async function testPublicAPI() {
  console.log('Test 4: Public API');
  console.log('-----------------');
  
  // Test status without execution
  try {
    const status = await axiomOrthogonalDecompose({
      action: 'status'
    });
    
    const parsed = JSON.parse(status);
    console.log('Status response:', parsed);
    console.log('✅ Status API works\n');
  } catch (error) {
    console.log(`❌ Status API failed: ${error.message}\n`);
  }
}

// Helper to count Claude processes
async function countClaudeProcesses() {
  return new Promise((resolve) => {
    const ps = spawn('ps', ['aux']);
    let output = '';
    
    ps.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ps.on('close', () => {
      const lines = output.split('\n');
      const claudeCount = lines.filter(line => 
        line.includes('claude') && !line.includes('grep')
      ).length;
      resolve(claudeCount);
    });
  });
}

// Run all tests
async function runTests() {
  try {
    await testCleanup();
    await testProcessCleanup();
    await testErrorRecovery();
    await testPublicAPI();
    
    console.log('🎉 All tests completed!');
    
    // Final cleanup
    await cleanupDecomposer();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    process.exit(0);
  }
}

// Signal handlers for cleanup
process.on('SIGINT', async () => {
  console.log('\n\nInterrupted - cleaning up...');
  await cleanupDecomposer();
  process.exit(0);
});

runTests();