#!/usr/bin/env node
/**
 * Interactive Monitoring and Control Demo
 *
 * Demonstrates:
 * 1. Multiple tasks running in parallel
 * 2. Real-time verbose output display
 * 3. Task selection and instruction injection
 * 4. Active intervention on violations
 */
import { EventBus } from '../core/event-bus.js';
import { ClaudeCodeSubprocessV3 } from '../claude-subprocess-v3.js';
import { VerboseMonitor } from '../monitors/verbose-monitor.js';
import { InteractiveController } from '../monitors/interactive-controller.js';
import { enhanceWithInteractiveControl } from '../monitors/interactive-controller.js';
import chalk from 'chalk';
async function runInteractiveDemo() {
    console.log(chalk.bold.cyan('\n🚀 AXIOM MCP V3 - INTERACTIVE MONITORING DEMO\n'));
    // Initialize systems
    const eventBus = new EventBus();
    const claudeSubprocess = new ClaudeCodeSubprocessV3({ eventBus });
    // Create interactive controller
    const controller = new InteractiveController({
        enableRealTimeControl: true,
        allowMidExecutionInjection: true,
        pauseOnViolation: true,
        requireApprovalFor: ['file_deletion', 'api_calls']
    });
    // Enhance Claude subprocess with interactive control
    enhanceWithInteractiveControl(claudeSubprocess, controller);
    // Create verbose monitor
    const monitor = new VerboseMonitor(eventBus, true);
    // Wire up monitor events to controller
    monitor.on('inject', (event) => {
        controller.injectGuidance(event.taskId, event.instruction);
    });
    monitor.on('pause', (event) => {
        controller.pauseTask(event.taskId);
    });
    monitor.on('resume', (event) => {
        controller.resumeTask(event.taskId);
    });
    monitor.on('abort', (event) => {
        controller.abortTask(event.taskId, 'User requested abort');
    });
    // Listen for approval requests
    controller.on('approval_required', (approval) => {
        console.log(chalk.yellow(`\n⚠️  Approval Required: ${approval.operation.tool}`));
        console.log(chalk.gray(`Task: ${approval.taskId}`));
        console.log(chalk.gray(`Details: ${JSON.stringify(approval.operation)}`));
        console.log(chalk.cyan(`\nType 'approve ${approval.id}' or 'deny ${approval.id}' in the monitor\n`));
    });
    // Listen for violations
    controller.on('task_paused', (event) => {
        console.log(chalk.red(`\n🛑 Task Paused: ${event.reason}\n`));
    });
    console.log(chalk.green('Interactive monitor started. Spawning test tasks...\n'));
    // Spawn multiple tasks to demonstrate parallel monitoring
    const tasks = [
        {
            prompt: `Write a Python function that calculates the factorial of a number. 
      Do NOT use the math library - implement it from scratch using recursion.`,
            title: 'Factorial Implementation'
        },
        {
            prompt: `Create a TypeScript class for managing a todo list with add, remove, 
      and complete methods. Include proper error handling.`,
            title: 'Todo List Manager'
        },
        {
            prompt: `Write a function that sorts an array of numbers using bubble sort.
      Do not use built-in sort methods.`,
            title: 'Bubble Sort Implementation'
        }
    ];
    // Execute tasks in parallel
    const promises = tasks.map(async (task, index) => {
        // Stagger starts slightly
        await new Promise(resolve => setTimeout(resolve, index * 1000));
        try {
            const result = await claudeSubprocess.execute(task.prompt, {
                taskId: `demo-task-${index + 1}`,
                title: task.title,
                enableMonitoring: true,
                enableIntervention: true,
                taskType: 'implementation'
            });
            return { task: task.title, success: true, result };
        }
        catch (error) {
            return { task: task.title, success: false, error };
        }
    });
    // Show instructions
    console.log(chalk.cyan('\n📝 Interactive Commands:'));
    console.log(chalk.gray('  select <id>     - Select a task to monitor'));
    console.log(chalk.gray('  inject <text>   - Inject instructions into selected task'));
    console.log(chalk.gray('  pause           - Pause selected task'));
    console.log(chalk.gray('  resume          - Resume selected task'));
    console.log(chalk.gray('  abort           - Abort selected task'));
    console.log(chalk.gray('  verbose <mode>  - Set verbose mode (all/selected/errors)'));
    console.log(chalk.gray('  history         - Show output history for selected task'));
    console.log(chalk.gray('  quit            - Exit the monitor\n'));
    console.log(chalk.yellow('💡 Try injecting guidance when you see violations!'));
    console.log(chalk.yellow('   Example: inject "Use iterative approach instead of recursion"\n'));
    // Wait for all tasks to complete
    const results = await Promise.all(promises);
    // Don't exit immediately - let user interact
    console.log(chalk.green('\n✅ All tasks completed. Monitor remains active for inspection.'));
    console.log(chalk.gray('Press Ctrl+C or type "quit" to exit.\n'));
}
// Run the demo
runInteractiveDemo().catch(console.error);
//# sourceMappingURL=interactive-demo.js.map