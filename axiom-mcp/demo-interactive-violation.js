#!/usr/bin/env node
/**
 * Demo: Real-Time Violation Detection and Intervention
 * 
 * This demonstrates how Axiom MCP v3 can:
 * 1. Detect code violations in real-time
 * 2. Pause execution when violations occur
 * 3. Inject guidance to correct the approach
 * 4. Resume with corrected behavior
 */

import { EventBus } from './dist-v3/src-v3/core/event-bus.js';
import { ClaudeCodeSubprocessV3 } from './dist-v3/src-v3/claude-subprocess-v3.js';
import { InteractiveController } from './dist-v3/src-v3/monitors/interactive-controller.js';
import { enhanceWithInteractiveControl } from './dist-v3/src-v3/monitors/interactive-controller.js';
import chalk from 'chalk';

async function demoViolationIntervention() {
  console.log(chalk.bold.cyan('\n🚀 AXIOM MCP V3 - VIOLATION INTERVENTION DEMO\n'));
  
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
  
  // Enhance Claude subprocess
  enhanceWithInteractiveControl(claudeSubprocess, controller);
  
  // Track violations
  let violationCount = 0;
  let interventionSent = false;
  
  // Listen for violations
  controller.on('task_paused', async (event) => {
    violationCount++;
    console.log(chalk.red(`\n🛑 VIOLATION #${violationCount}: ${event.reason}\n`));
    
    if (!interventionSent) {
      interventionSent = true;
      console.log(chalk.yellow('🤖 Sending intervention in 2 seconds...\n'));
      
      setTimeout(() => {
        const guidance = `
IMPORTANT: You are violating our coding standards!

Instead of implementing custom math functions, please use built-in libraries:
- Use Math.pow(x, y) for exponentiation
- Use Math.factorial() or a library for factorial
- Use Array.sort() for sorting

Please acknowledge this guidance and refactor your code to use the appropriate built-in methods.
`;
        
        console.log(chalk.magenta('💉 INJECTING GUIDANCE:'));
        console.log(chalk.gray(guidance));
        
        controller.injectGuidance(event.taskId, guidance);
        controller.resumeTask(event.taskId);
        
        console.log(chalk.green('\n▶️ Task resumed with guidance\n'));
      }, 2000);
    }
  });
  
  // Monitor output
  eventBus.on('event', (event) => {
    if (event.event === 'claude_stdout') {
      const output = event.payload.toString();
      // Show key output lines
      if (output.includes('function') || output.includes('Math.') || output.includes('IMPORTANT')) {
        console.log(chalk.gray(`[OUTPUT] ${output.trim()}`));
      }
    }
  });
  
  // Test prompt that will violate rules
  const violatingPrompt = `
Write a JavaScript function that calculates x raised to the power of y.
Requirements:
- Do NOT use Math.pow() 
- Implement the power calculation from scratch using a loop
- Handle negative exponents
- The function should be named customPower(x, y)
`;
  
  console.log(chalk.cyan('📝 Executing task with violation-prone requirements:\n'));
  console.log(chalk.gray(violatingPrompt));
  console.log(chalk.yellow('\n⚡ Monitoring for violations...\n'));
  
  try {
    const result = await claudeSubprocess.execute(violatingPrompt, {
      taskId: 'demo-violation',
      title: 'Custom Power Function',
      enableMonitoring: true,
      enableIntervention: true,
      taskType: 'implementation'
    });
    
    console.log(chalk.green('\n✅ Task completed!'));
    console.log(chalk.cyan('\n📊 Summary:'));
    console.log(`- Violations detected: ${violationCount}`);
    console.log(`- Intervention applied: ${interventionSent ? 'Yes' : 'No'}`);
    console.log(`- Task duration: ${result.duration}ms`);
    
    // Check if final code uses Math.pow
    const usesMathPow = result.response.includes('Math.pow');
    console.log(`- Final code uses Math.pow: ${usesMathPow ? '✅ Yes' : '❌ No'}`);
    
    if (usesMathPow) {
      console.log(chalk.green('\n🎉 SUCCESS: Intervention successfully corrected the approach!'));
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error);
  }
  
  process.exit(0);
}

// Run the demo
demoViolationIntervention().catch(console.error);