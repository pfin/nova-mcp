#!/usr/bin/env node
/**
 * Test Interactive Monitoring
 * 
 * This script demonstrates the full verbose monitoring and interactive control
 */

import { EventBus } from './dist-v3/src-v3/core/event-bus.js';
import { ClaudeCodeSubprocessV3 } from './dist-v3/src-v3/claude-subprocess-v3.js';
import { VerboseMonitor } from './dist-v3/src-v3/monitors/verbose-monitor.js';
import { InteractiveController } from './dist-v3/src-v3/monitors/interactive-controller.js';
import { enhanceWithInteractiveControl } from './dist-v3/src-v3/monitors/interactive-controller.js';
import chalk from 'chalk';

async function testInteractiveMonitoring() {
  console.log(chalk.bold.cyan('\n🚀 TESTING INTERACTIVE MONITORING\n'));
  
  // Initialize systems
  const eventBus = new EventBus({ logDir: './logs-v3' });
  const claudeSubprocess = new ClaudeCodeSubprocessV3({ eventBus });
  
  // Create interactive controller
  const controller = new InteractiveController({
    enableRealTimeControl: true,
    allowMidExecutionInjection: true,
    pauseOnViolation: true,
    requireApprovalFor: []
  });
  
  // Enhance Claude subprocess with interactive control
  enhanceWithInteractiveControl(claudeSubprocess, controller);
  
  // Create verbose monitor - set to non-interactive for now
  const monitor = new VerboseMonitor(eventBus, false);
  
  // Set up monitoring
  monitor.on('inject', (event) => {
    console.log(chalk.magenta(`\n💉 Injecting guidance: ${event.instruction}`));
    controller.injectGuidance(event.taskId, event.instruction);
  });
  
  // Listen for violations and automatically inject corrections
  controller.on('task_paused', async (event) => {
    console.log(chalk.red(`\n🛑 Task Paused: ${event.reason}`));
    
    // Auto-inject correction after 2 seconds
    setTimeout(() => {
      console.log(chalk.yellow('\n🤖 Auto-injecting correction...'));
      controller.injectGuidance(event.taskId, 
        'I see you\'re implementing a custom math function. Please use the built-in Math library instead. For example, use Math.pow() for exponentiation.');
      controller.resumeTask(event.taskId);
    }, 2000);
  });
  
  // Test task that will trigger violations
  const testPrompt = `
Write a JavaScript function that calculates x raised to the power of y.
Do not use Math.pow() - implement the power function from scratch using a loop.
`;
  
  console.log(chalk.cyan('Executing test task that will trigger intervention...\n'));
  
  try {
    const result = await claudeSubprocess.execute(testPrompt, {
      taskId: 'test-violation-1',
      title: 'Power Function (Will Violate)',
      enableMonitoring: true,
      enableIntervention: true,
      taskType: 'implementation'
    });
    
    console.log(chalk.green('\n✅ Task completed!'));
    console.log(chalk.gray('\nFinal output:'));
    console.log(result.response.substring(0, 500) + '...');
    
    // Get violations report
    console.log(chalk.yellow('\n📊 Monitoring Report:'));
    console.log(`- Task ID: ${result.id}`);
    console.log(`- Duration: ${result.duration}ms`);
    console.log(`- Violations detected: ${result.verification?.violations || 0}`);
    
    // Show task tree
    console.log(chalk.cyan('\n🌳 Task Tree:'));
    console.log(monitor.getTaskTree());
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error);
  }
  
  // Test parallel tasks
  console.log(chalk.cyan('\n\n📋 Testing parallel task monitoring...\n'));
  
  const parallelTasks = [
    {
      prompt: 'Write a function to calculate factorial without using recursion',
      id: 'factorial-task'
    },
    {
      prompt: 'Create a function to sort an array without using built-in sort',
      id: 'sort-task'
    }
  ];
  
  const promises = parallelTasks.map(task => 
    claudeSubprocess.execute(task.prompt, {
      taskId: task.id,
      title: task.id,
      enableMonitoring: true,
      enableIntervention: true,
      taskType: 'implementation'
    })
  );
  
  // Simulate user injection after 3 seconds
  setTimeout(() => {
    console.log(chalk.magenta('\n👤 Simulating user guidance injection...'));
    controller.injectGuidance('factorial-task', 
      'Please add input validation to check for negative numbers');
  }, 3000);
  
  const results = await Promise.all(promises);
  
  console.log(chalk.green('\n✅ All tasks completed!'));
  
  // Export logs
  console.log(chalk.cyan('\n📄 Exporting task logs...'));
  const logs = monitor.exportLogs();
  console.log(chalk.gray(`Total log size: ${logs.length} characters`));
  
  process.exit(0);
}

// Run the test
testInteractiveMonitoring().catch(console.error);