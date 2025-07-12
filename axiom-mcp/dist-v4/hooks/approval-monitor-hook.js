/**
 * Approval Monitor Hook - Watches for approval prompts and responds appropriately
 * This is the simple solution to the approval blocking problem
 */
import { HookEvent } from '../core/hook-orchestrator.js';
import { logDebug } from '../core/simple-logger.js';
// Track monitoring for each task
const taskMonitors = new Map();
const taskApprovalState = new Map();
// Approval patterns to watch for
const approvalPatterns = [
    {
        name: 'file-creation',
        pattern: /Do you want to create (.+)\?[\s\S]*?❯?\s*1\.\s+Yes/,
        response: '1',
        extract: (match) => match[1]
    },
    {
        name: 'trust-dialog',
        pattern: /Do you trust the files in this folder\?[\s\S]*?1\.\s+Yes/,
        response: '1',
        extract: () => 'folder trust'
    },
    {
        name: 'tool-usage',
        pattern: /Do you want to use (.+)\?[\s\S]*?❯?\s*1\.\s+Yes/,
        response: '1',
        extract: (match) => match[1]
    },
    {
        name: 'file-overwrite',
        pattern: /Do you want to overwrite (.+)\?[\s\S]*?❯?\s*1\.\s+Yes/,
        response: '1',
        extract: (match) => match[1]
    }
];
// Mock test patterns to watch for and interrupt
const mockPatterns = [
    /import.*mock/i,
    /jest\.mock/,
    /describe\(['"].*mock/i,
    /const mock\w+\s*=/,
    /\.mockImplementation/,
    /\.mockReturnValue/
];
export const approvalMonitorHook = {
    name: 'approval-monitor-hook',
    events: [HookEvent.EXECUTION_STARTED, HookEvent.EXECUTION_COMPLETED, HookEvent.EXECUTION_FAILED],
    priority: 90, // Run before other monitors
    handler: async (context) => {
        const { event, execution } = context;
        if (!execution?.taskId) {
            return { action: 'continue' };
        }
        const taskId = execution.taskId;
        if (event === HookEvent.EXECUTION_STARTED) {
            logDebug('APPROVAL-MONITOR', `Starting approval monitoring for task ${taskId}`);
            // Clear any existing monitor
            if (taskMonitors.has(taskId)) {
                clearInterval(taskMonitors.get(taskId));
            }
            // Initialize approval state
            taskApprovalState.set(taskId, { lastCheck: '', responded: new Set() });
            // Set up frequent monitoring (every 2 seconds for approval prompts)
            const monitor = setInterval(async () => {
                try {
                    // Get task from orchestrator or status manager
                    const orchestrator = context.db?.hookOrchestrator ||
                        context.eventBus?.hookOrchestrator ||
                        context.statusManager?.hookOrchestrator;
                    const task = orchestrator?.getActiveTask?.(taskId) ||
                        context.statusManager?.getTaskStatus?.(taskId);
                    if (!task || task.status !== 'running') {
                        logDebug('APPROVAL-MONITOR', `Task ${taskId} no longer running, stopping monitor`);
                        clearInterval(monitor);
                        taskMonitors.delete(taskId);
                        taskApprovalState.delete(taskId);
                        return;
                    }
                    // Get recent output (last 1000 chars should be enough)
                    const recentOutput = task.output?.slice(-1000) || '';
                    const state = taskApprovalState.get(taskId);
                    // Only check if output has changed
                    if (recentOutput === state.lastCheck) {
                        return;
                    }
                    // Check for approval patterns
                    for (const approvalPattern of approvalPatterns) {
                        const match = recentOutput.match(approvalPattern.pattern);
                        if (match) {
                            const item = approvalPattern.extract(match);
                            const responseKey = `${approvalPattern.name}:${item}`;
                            // Don't respond twice to the same prompt
                            if (!state.responded.has(responseKey)) {
                                logDebug('APPROVAL-MONITOR', `Detected ${approvalPattern.name} prompt for: ${item}`);
                                // Get auto-approve setting from context or default to true
                                const autoApprove = context.metadata?.autoApprove ?? true;
                                const response = autoApprove && approvalPattern.name === 'file-creation' ? '2' : '1';
                                // Send response
                                if (task.executor?.write) {
                                    logDebug('APPROVAL-MONITOR', `Auto-responding with '${response}' to ${approvalPattern.name}`);
                                    task.executor.write(response);
                                    state.responded.add(responseKey);
                                    // Emit event for tracking
                                    if (context.eventBus) {
                                        context.eventBus.emit('approval:handled', {
                                            taskId,
                                            type: approvalPattern.name,
                                            item,
                                            response,
                                            timestamp: Date.now()
                                        });
                                    }
                                }
                            }
                        }
                    }
                    // Check for mock patterns (interrupt if found)
                    const hasMocks = mockPatterns.some(pattern => pattern.test(recentOutput));
                    if (hasMocks && !state.responded.has('mock-interrupt')) {
                        logDebug('APPROVAL-MONITOR', `Detected mock test pattern - interrupting!`);
                        if (task.executor?.write) {
                            // Send interrupt message
                            task.executor.write('\x1b'); // ESC key
                            setTimeout(() => {
                                task.executor.write('[INTERRUPT] No mocks! Use real implementations only.\n');
                            }, 500);
                            state.responded.add('mock-interrupt');
                            // Emit event
                            if (context.eventBus) {
                                context.eventBus.emit('pattern:detected', {
                                    taskId,
                                    pattern: 'mock-tests',
                                    action: 'interrupted',
                                    timestamp: Date.now()
                                });
                            }
                        }
                    }
                    // Update last check
                    state.lastCheck = recentOutput;
                }
                catch (error) {
                    logDebug('APPROVAL-MONITOR', `Error monitoring task ${taskId}:`, error);
                }
            }, 2000); // Check every 2 seconds for quick response
            taskMonitors.set(taskId, monitor);
        }
        // Clean up on completion/failure
        if (event === HookEvent.EXECUTION_COMPLETED || event === HookEvent.EXECUTION_FAILED) {
            logDebug('APPROVAL-MONITOR', `Stopping approval monitor for task ${taskId}`);
            if (taskMonitors.has(taskId)) {
                clearInterval(taskMonitors.get(taskId));
                taskMonitors.delete(taskId);
                taskApprovalState.delete(taskId);
            }
        }
        return { action: 'continue' };
    }
};
// Clean up on process exit
process.on('exit', () => {
    for (const [taskId, monitor] of taskMonitors) {
        clearInterval(monitor);
    }
});
export default approvalMonitorHook;
//# sourceMappingURL=approval-monitor-hook.js.map