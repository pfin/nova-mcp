#!/usr/bin/env node
/**
 * Test script for enhanced Claude orchestrator with pattern-based intervention
 * 
 * This demonstrates:
 * 1. Spawning a Claude instance with pattern monitoring
 * 2. Detecting planning/research patterns
 * 3. Automatic intervention when toxic patterns detected
 * 4. Getting intervention statistics
 */

import { axiomClaudeOrchestrateEnhanced } from './dist-v4/tools/claude-orchestrate-with-patterns.js';

async function main() {
  console.log('🚀 Testing Enhanced Claude Orchestrator with Pattern Intervention\n');

  const instanceId = `test-${Date.now()}`;

  try {
    // 1. Spawn Claude instance with pattern monitoring
    console.log('1️⃣ Spawning Claude instance with pattern monitoring...');
    const spawnResult = await axiomClaudeOrchestrateEnhanced({
      action: 'spawn',
      instanceId
    });
    console.log(`✅ ${spawnResult}\n`);

    // Wait for Claude to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. Send a prompt that will trigger planning patterns
    console.log('2️⃣ Sending prompt that triggers planning patterns...');
    const prompt = 'analyze the best way to implement a factorial function and create a comprehensive plan';
    
    await axiomClaudeOrchestrateEnhanced({
      action: 'prompt',
      instanceId,
      prompt
    });
    console.log('✅ Prompt sent\n');

    // 3. Monitor output for pattern detection
    console.log('3️⃣ Monitoring output for patterns (10 seconds)...');
    let lastOutputLength = 0;
    
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const outputResult = await axiomClaudeOrchestrateEnhanced({
        action: 'get_output',
        instanceId,
        lines: 5
      });
      
      const output = JSON.parse(outputResult).output;
      if (output.length > lastOutputLength) {
        console.log(`[${i+1}s] New output detected...`);
        lastOutputLength = output.length;
      }
    }

    // 4. Get intervention statistics
    console.log('\n4️⃣ Getting intervention statistics...');
    const interventionsResult = await axiomClaudeOrchestrateEnhanced({
      action: 'get_interventions',
      instanceId
    });
    
    const interventions = JSON.parse(interventionsResult);
    console.log('📊 Intervention Summary:');
    console.log(JSON.stringify(interventions, null, 2));

    // 5. Get final status
    console.log('\n5️⃣ Getting final status...');
    const statusResult = await axiomClaudeOrchestrateEnhanced({
      action: 'status',
      instanceId
    });
    
    const status = JSON.parse(statusResult);
    console.log('📈 Instance Status:');
    console.log(`- State: ${status.state}`);
    console.log(`- Uptime: ${status.uptime}ms`);
    console.log(`- Interventions: ${status.interventionCount}`);
    console.log(`- Pattern Stats:`, status.interventionStats);

    // 6. Add custom pattern
    console.log('\n6️⃣ Adding custom pattern for "TODO" detection...');
    await axiomClaudeOrchestrateEnhanced({
      action: 'add_pattern',
      instanceId,
      pattern: {
        id: 'custom-todo-detector',
        pattern: 'TODO:',
        action: 'CUSTOM_TODO_ALERT',
        priority: 10,
        cooldown: 2000,
        description: 'Custom pattern to detect TODO items'
      }
    });
    console.log('✅ Custom pattern added');

    // 7. Test with TODO prompt
    console.log('\n7️⃣ Testing with TODO-generating prompt...');
    await axiomClaudeOrchestrateEnhanced({
      action: 'steer',
      instanceId,
      prompt: 'Create a TODO list for implementing a REST API'
    });

    // Wait and check interventions again
    await new Promise(resolve => setTimeout(resolve, 5000));

    const finalInterventions = await axiomClaudeOrchestrateEnhanced({
      action: 'get_interventions',
      instanceId
    });
    
    console.log('\n📊 Final Interventions:');
    console.log(finalInterventions);

    // Cleanup
    console.log('\n8️⃣ Cleaning up...');
    await axiomClaudeOrchestrateEnhanced({
      action: 'cleanup',
      instanceId
    });
    console.log('✅ Instance cleaned up');

  } catch (error) {
    console.error('❌ Error:', error.message);
    // Try to cleanup on error
    try {
      await axiomClaudeOrchestrateEnhanced({
        action: 'cleanup',
        instanceId
      });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

// Demonstrate pattern detection capabilities
function showBuiltInPatterns() {
  console.log('\n📋 Built-in Pattern Detection Capabilities:\n');
  
  const patterns = [
    {
      name: 'Planning Instead of Doing',
      triggers: ['let me plan', "I'll outline", 'first, I will'],
      intervention: 'Skip the planning. Implement the solution directly.'
    },
    {
      name: 'Research Mode',
      triggers: ['investigate', 'explore', 'analyze the requirements'],
      intervention: 'Stop researching. Implement what you know now.'
    },
    {
      name: 'TODO Without Implementation',
      triggers: ['TODO: ...'],
      intervention: 'Implement this TODO item now. Write the actual code.'
    },
    {
      name: 'Analysis Paralysis',
      triggers: ['we have several options', 'there are multiple approaches'],
      intervention: 'Pick the first approach and implement it now.'
    },
    {
      name: 'False Completion Claims',
      triggers: ["I've successfully completed", 'task is complete'],
      intervention: 'Verify actual implementation exists.'
    }
  ];

  patterns.forEach(pattern => {
    console.log(`🎯 ${pattern.name}`);
    console.log(`   Triggers: ${pattern.triggers.join(', ')}`);
    console.log(`   Intervention: "${pattern.intervention}"`);
    console.log();
  });
}

// Run the test
console.log('Enhanced Claude Orchestrator Test');
console.log('=================================');
showBuiltInPatterns();
console.log('Starting test...\n');

main().catch(console.error);