#!/usr/bin/env node
/**
 * Demonstration of parallel Claude execution using git worktrees
 * This shows how multiple Claude instances can work on the same problem
 * without file conflicts, enabling true MCTS-style exploration
 */

import { axiomClaudeOrchestrateWorktree } from './dist-v4/tools/axiom-claude-orchestrate-worktree.js';

console.log('🚀 Parallel Claude Execution Demo with Git Worktrees');
console.log('===================================================\n');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  try {
    // Step 1: Spawn three Claude instances with worktree isolation
    console.log('📦 Step 1: Spawning 3 Claude instances with isolated worktrees...\n');
    
    const instances = ['solver-functional', 'solver-oop', 'solver-hybrid'];
    
    for (const id of instances) {
      console.log(`  → Spawning ${id}...`);
      const result = await axiomClaudeOrchestrateWorktree({
        action: 'spawn',
        instanceId: id,
        useWorktree: true,
        baseBranch: 'main'
      });
      console.log(`  ✓ ${result}`);
    }
    
    console.log('\n✅ All instances spawned with isolated environments!\n');
    
    // Wait for instances to be ready
    await sleep(3000);
    
    // Step 2: Check status to see worktree info
    console.log('📊 Step 2: Checking instance status...\n');
    
    const status = await axiomClaudeOrchestrateWorktree({
      action: 'status',
      instanceId: '*'
    });
    
    const statusData = JSON.parse(status);
    console.log('Active instances:');
    statusData.instances.forEach(inst => {
      console.log(`  - ${inst.id}:`);
      console.log(`    State: ${inst.state}`);
      console.log(`    Worktree: ${inst.worktreePath || 'none'}`);
      console.log(`    Branch: ${inst.branch || 'main'}`);
    });
    
    console.log('\n🔍 Notice: Each instance has its own directory and branch!');
    console.log('This prevents any file conflicts between parallel executions.\n');
    
    // Step 3: Give each instance a different approach
    console.log('🎯 Step 3: Assigning different approaches to each instance...\n');
    
    const approaches = {
      'solver-functional': 'Implement a factorial function using pure functional programming with recursion',
      'solver-oop': 'Implement a factorial calculator using object-oriented design with a Calculator class',
      'solver-hybrid': 'Implement factorial using a hybrid approach with memoization'
    };
    
    for (const [id, prompt] of Object.entries(approaches)) {
      console.log(`  → Prompting ${id}...`);
      await axiomClaudeOrchestrateWorktree({
        action: 'prompt',
        instanceId: id,
        prompt: prompt
      });
      console.log(`  ✓ Prompt sent to ${id}`);
      await sleep(1000); // Small delay between prompts
    }
    
    console.log('\n💡 All instances now working in parallel on different approaches!');
    console.log('No file conflicts possible - each has its own workspace.\n');
    
    // Step 4: Monitor progress
    console.log('⏱️  Step 4: Monitoring progress (10 seconds)...\n');
    
    for (let i = 0; i < 3; i++) {
      await sleep(3000);
      console.log(`Progress check ${i + 1}/3:`);
      
      for (const id of instances) {
        const output = await axiomClaudeOrchestrateWorktree({
          action: 'get_output',
          instanceId: id,
          lines: 5
        });
        const outputData = JSON.parse(output);
        const preview = outputData.output.split('\n').slice(-2).join(' ').substring(0, 60);
        console.log(`  ${id}: ${preview}...`);
      }
      console.log('');
    }
    
    // Step 5: Steer one instance
    console.log('🎮 Step 5: Steering the functional approach...\n');
    
    await axiomClaudeOrchestrateWorktree({
      action: 'steer',
      instanceId: 'solver-functional',
      prompt: 'Add comprehensive unit tests for the factorial function'
    });
    console.log('✓ Steered solver-functional to add tests\n');
    
    // Step 6: Final status check
    console.log('📈 Step 6: Final status check...\n');
    
    const finalStatus = await axiomClaudeOrchestrateWorktree({
      action: 'status',
      instanceId: '*'
    });
    
    console.log('Final status:', JSON.parse(finalStatus));
    
    // Step 7: Cleanup
    console.log('\n🧹 Step 7: Cleaning up instances...\n');
    
    for (const id of instances) {
      console.log(`  → Cleaning up ${id}...`);
      await axiomClaudeOrchestrateWorktree({
        action: 'cleanup',
        instanceId: id
      });
      console.log(`  ✓ ${id} cleaned up`);
    }
    
    console.log('\n✨ Demo complete! Key takeaways:');
    console.log('1. Each Claude instance ran in its own git worktree');
    console.log('2. No file conflicts occurred despite parallel execution');
    console.log('3. Each approach was explored independently');
    console.log('4. We could steer instances individually');
    console.log('5. Cleanup removed worktrees automatically');
    console.log('\nThis enables true MCTS-style parallel exploration! 🎯');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the demo
runDemo().catch(console.error);