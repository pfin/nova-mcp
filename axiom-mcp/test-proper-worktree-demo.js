#!/usr/bin/env node
/**
 * Demonstration of PROPER parallel Claude execution with git worktrees
 * This shows how to correctly commit and merge work from parallel instances
 */

import { axiomClaudeOrchestrateProper } from './dist-v4/tools/axiom-claude-orchestrate-proper.js';

console.log('🚀 Proper Parallel Claude Execution with Auto-Commit/Merge');
console.log('========================================================\n');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  try {
    // Step 1: Spawn three Claude instances for orthogonal tasks
    console.log('📦 Step 1: Spawning 3 Claude instances for orthogonal tasks...\n');
    
    const tasks = [
      { id: 'models', prompt: 'Create data models in models/user.js and models/post.js. Just schemas, no dependencies.' },
      { id: 'routes', prompt: 'Create Express routes in routes/api.js. Mock responses only, no database.' },
      { id: 'tests', prompt: 'Create unit tests in tests/api.test.js. Test structure only, mock everything.' }
    ];
    
    // Spawn all instances
    for (const task of tasks) {
      console.log(`  → Spawning ${task.id}...`);
      const result = await axiomClaudeOrchestrateProper({
        action: 'spawn',
        instanceId: task.id,
        useWorktree: true,
        baseBranch: 'main'
      });
      console.log(`  ✓ ${result}`);
    }
    
    console.log('\n✅ All instances spawned with isolated worktrees!\n');
    
    // Wait for instances to be ready
    await sleep(3000);
    
    // Step 2: Send prompts to each instance
    console.log('📝 Step 2: Sending orthogonal tasks to each instance...\n');
    
    for (const task of tasks) {
      console.log(`  → Prompting ${task.id}...`);
      await axiomClaudeOrchestrateProper({
        action: 'prompt',
        instanceId: task.id,
        prompt: task.prompt
      });
      console.log(`  ✓ Task sent to ${task.id}`);
      await sleep(500);
    }
    
    console.log('\n💡 All instances working on orthogonal tasks (no conflicts possible)!\n');
    
    // Step 3: Monitor progress and wait for completion
    console.log('⏱️  Step 3: Monitoring progress...\n');
    
    let allComplete = false;
    let checks = 0;
    
    while (!allComplete && checks < 20) {
      await sleep(5000);
      checks++;
      
      console.log(`Progress check ${checks}:`);
      
      const status = await axiomClaudeOrchestrateProper({
        action: 'status',
        instanceId: '*'
      });
      
      const statusData = JSON.parse(status);
      let completeCount = 0;
      
      for (const inst of statusData.instances) {
        const state = inst.state === 'complete' ? '✓' : '⏳';
        const commit = inst.committed ? '📦' : '📝';
        const merge = inst.merged ? '🔀' : '⏸️';
        
        console.log(`  ${inst.id}: ${state} State: ${inst.state} | ${commit} Committed: ${inst.committed} | ${merge} Merged: ${inst.merged}`);
        
        if (inst.state === 'complete') completeCount++;
      }
      
      allComplete = completeCount === tasks.length;
      console.log('');
    }
    
    // Step 4: Check final status
    console.log('📊 Step 4: Final status check...\n');
    
    const finalStatus = await axiomClaudeOrchestrateProper({
      action: 'status',
      instanceId: '*'
    });
    
    const finalData = JSON.parse(finalStatus);
    
    console.log('Final results:');
    for (const inst of finalData.instances) {
      console.log(`  ${inst.id}:`);
      console.log(`    Branch: ${inst.branch || 'none'}`);
      console.log(`    Committed: ${inst.committed ? '✓' : '✗'}`);
      console.log(`    Merged: ${inst.merged ? '✓' : '✗'}`);
    }
    
    // Step 5: Merge any remaining work
    console.log('\n🔀 Step 5: Merging all completed work...\n');
    
    const mergeResult = await axiomClaudeOrchestrateProper({
      action: 'merge_all',
      instanceId: 'dummy' // Required by schema but not used
    });
    
    const mergeData = JSON.parse(mergeResult);
    console.log(`Merge results: ${mergeData.merged}/${mergeData.total} successful`);
    
    if (mergeData.failed.length > 0) {
      console.log(`Failed merges: ${mergeData.failed.join(', ')}`);
      console.log('⚠️  This should NOT happen with truly orthogonal tasks!');
    }
    
    // Step 6: Cleanup
    console.log('\n🧹 Step 6: Cleaning up instances...\n');
    
    for (const task of tasks) {
      console.log(`  → Cleaning up ${task.id}...`);
      await axiomClaudeOrchestrateProper({
        action: 'cleanup',
        instanceId: task.id
      });
      console.log(`  ✓ ${task.id} cleaned up (work preserved)`);
    }
    
    console.log('\n✨ Demo complete! Key improvements:');
    console.log('1. Work is automatically committed when Claude completes');
    console.log('2. Orthogonal tasks are automatically merged (no conflicts)');
    console.log('3. Cleanup preserves all work (no --force delete)');
    console.log('4. Branches are properly managed and cleaned up');
    console.log('5. Full git history preserved for audit trail');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the demo
runDemo().catch(console.error);