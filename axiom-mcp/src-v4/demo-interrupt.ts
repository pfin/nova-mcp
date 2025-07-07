/**
 * Simple demonstration of the interrupt system
 * This shows how hooks interact without needing full execution
 */

import { HookOrchestrator, HookEvent } from './core/hook-orchestrator.js';
import { Logger } from './core/logger.js';
import interruptHandlerHook from './hooks/interrupt-handler-hook.js';
import enhancedVerboseHook from './hooks/enhanced-verbose-hook.js';
import monitoringDashboardHook from './hooks/monitoring-dashboard-hook.js';

// Set up logger
const logger = Logger.getInstance();
logger.setLogLevel(0); // TRACE level

console.log('\n🚀 AXIOM V4 INTERRUPT SYSTEM DEMO\n');

// Create a mock orchestrator
const orchestrator = new HookOrchestrator({} as any, {} as any);

// Register our enhanced hooks
orchestrator.registerHook(enhancedVerboseHook);
orchestrator.registerHook(interruptHandlerHook);
orchestrator.registerHook(monitoringDashboardHook);

// Simulate execution
async function simulateExecution() {
  const taskId = 'demo-task-123';
  
  // Start execution
  console.log('📝 Starting execution: "Create a factorial function in Python"\n');
  
  await orchestrator.triggerHooks(HookEvent.EXECUTION_STARTED, {
    execution: { taskId, status: 'running' },
    request: {
      tool: 'axiom_spawn',
      args: {
        prompt: 'Create a factorial function in Python',
        verboseMasterMode: true
      }
    }
  });
  
  // Simulate Python code being written
  const pythonStream = `
Creating factorial.py...

def factorial(n):
    """Calculate factorial of n"""
    if n < 0:
        raise ValueError("Factorial not defined for negative numbers")
    elif n == 0 or n == 1:
        return 1
    else:
        return n * factorial(n - 1)
`;

  console.log('\n📊 Simulating Python code generation...\n');
  
  // Send stream data
  for (const chunk of pythonStream.split('\n')) {
    if (chunk.trim()) {
      await orchestrator.triggerHooks(HookEvent.EXECUTION_STREAM, {
        execution: { taskId, status: 'running' },
        stream: { data: chunk + '\n', source: taskId }
      });
      
      // Small delay to simulate real streaming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('\n🛑 Sending interrupt command...\n');
  
  // Send interrupt
  const interruptResult = await orchestrator.triggerHooks(HookEvent.EXECUTION_STREAM, {
    execution: { taskId, status: 'running' },
    stream: { data: '[INTERRUPT: CHANGE TO JAVA]\n', source: taskId }
  });
  
  if (interruptResult.action === 'modify') {
    console.log('✅ Interrupt detected and processed!');
    console.log('📝 Command to inject:', interruptResult.modifications?.command);
  }
  
  // Simulate Java implementation
  console.log('\n♨️ Simulating Java implementation after interrupt...\n');
  
  const javaStream = `
Deleting factorial.py...
Creating Factorial.java...

public class Factorial {
    public static long factorial(int n) {
        if (n < 0) {
            throw new IllegalArgumentException("Factorial not defined for negative numbers");
        }
        if (n == 0 || n == 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }
    
    public static void main(String[] args) {
        System.out.println("5! = " + factorial(5));
    }
}
`;

  for (const chunk of javaStream.split('\n')) {
    if (chunk.trim()) {
      await orchestrator.triggerHooks(HookEvent.EXECUTION_STREAM, {
        execution: { taskId, status: 'running' },
        stream: { data: chunk + '\n', source: taskId }
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  // Complete execution
  await orchestrator.triggerHooks(HookEvent.EXECUTION_COMPLETED, {
    execution: { taskId, status: 'completed', output: 'Successfully created Factorial.java' }
  });
  
  console.log('\n✨ Demo complete! Check the logs above to see:');
  console.log('  - Pattern detection (Python/Java code)');
  console.log('  - Interrupt handling');
  console.log('  - Real-time metrics');
  console.log('  - Enhanced logging with colors\n');
}

// Run the demo
simulateExecution().catch(console.error);