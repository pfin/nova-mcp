#!/usr/bin/env node

/**
 * Simple test of decomposer without Claude execution
 */

import { axiomOrthogonalDecompose, cleanupDecomposer } from './dist-v4/tools/axiom-orthogonal-decomposer.js';

console.log('🧪 Testing Orthogonal Decomposer (Simple)\n');

async function test() {
  try {
    // Test 1: Decomposition
    console.log('1. Testing decomposition...');
    const decomposed = await axiomOrthogonalDecompose({
      action: 'decompose',
      prompt: 'Create a REST API with authentication'
    });
    
    const tasks = JSON.parse(decomposed).tasks;
    console.log(`✅ Decomposed into ${tasks.length} tasks:`);
    tasks.forEach(t => {
      console.log(`   - ${t.id}: ${t.prompt.substring(0, 50)}...`);
    });
    
    // Test 2: Status
    console.log('\n2. Testing status...');
    const status = await axiomOrthogonalDecompose({
      action: 'status'
    });
    console.log('✅ Status:', status);
    
    // Test 3: Different decomposition patterns
    console.log('\n3. Testing different patterns...');
    
    const cacheDecomposed = await axiomOrthogonalDecompose({
      action: 'decompose',
      prompt: 'Implement an LRU cache with TTL support'
    });
    const cacheTasks = JSON.parse(cacheDecomposed).tasks;
    console.log(`✅ Cache task decomposed into ${cacheTasks.length} tasks`);
    
    const genericDecomposed = await axiomOrthogonalDecompose({
      action: 'decompose', 
      prompt: 'Build a web scraper'
    });
    const genericTasks = JSON.parse(genericDecomposed).tasks;
    console.log(`✅ Generic task decomposed into ${genericTasks.length} tasks`);
    
    // Test 4: Cleanup
    console.log('\n4. Testing cleanup...');
    await cleanupDecomposer();
    console.log('✅ Cleanup completed');
    
    // Test 5: After cleanup
    console.log('\n5. Testing after cleanup...');
    const afterStatus = await axiomOrthogonalDecompose({
      action: 'status'
    });
    console.log('✅ Can still use after cleanup:', afterStatus);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();