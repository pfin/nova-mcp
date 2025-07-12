/**
 * Approval Monitor Hook - Watches for approval prompts and responds automatically
 * This is the simple solution to the approval blocking problem
 */
import { HookEvent } from '../core/hook-orchestrator.js';
import { logDebug } from '../core/simple-logger.js';
// Track approval state for each task
const taskApprovalState = new Map();
// Approval patterns to watch for
const approvalPatterns = [
    {
        name: 'file-creation',
        pattern: /Do you want to create (.+)\?[\s\S]*?[❯>]?\s*1\.\s+Yes/,
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
        pattern: /Do you want to use (.+)\?[\s\S]*?[❯>]?\s*1\.\s+Yes/,
        response: '1',
        extract: (match) => match[1]
    },
    {
        name: 'file-overwrite',
        pattern: /Do you want to overwrite (.+)\?[\s\S]*?[❯>]?\s*1\.\s+Yes/,
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
// Simple execution stream monitoring
let streamBuffer = new Map();
const approvalMonitorHook = {
    name: 'approval-monitor-hook',
    priority: 95, // High priority to catch prompts quickly
    events: [HookEvent.EXECUTION_STARTED, HookEvent.EXECUTION_COMPLETED],
    handler: async (context) => {
        const { event, execution } = context;
        if (!execution?.taskId) {
            return { action: 'continue' };
        }
        const taskId = execution.taskId;
        if (event === HookEvent.EXECUTION_STARTED) {
            logDebug('APPROVAL-MONITOR', `Starting approval monitoring for task ${taskId}`);
            // Initialize task state
            taskApprovalState.set(taskId, {
                lastCheck: Date.now(),
                approvalsSent: new Set(),
                buffer: ''
            });
            // Set up monitoring interval
            const checkInterval = setInterval(() => {
                const task = context.db?.hookOrchestrator?.getActiveTask?.(taskId);
                if (!task || task.status !== 'running') {
                    clearInterval(checkInterval);
                    taskApprovalState.delete(taskId);
                    return;
                }
                const state = taskApprovalState.get(taskId);
                const output = task.output || '';
                // Update buffer with recent output
                state.buffer = output.slice(-4096);
                // Check for approval patterns
                for (const pattern of approvalPatterns) {
                    const match = state.buffer.match(pattern.pattern);
                    if (match && !state.approvalsSent.has(pattern.name)) {
                        const item = pattern.extract(match);
                        logDebug('APPROVAL-MONITOR', `Found ${pattern.name} prompt for "${item}" in task ${taskId}, sending response: ${pattern.response}`);
                        state.approvalsSent.add(pattern.name);
                        // Send approval via executor
                        if (task.executor?.write) {
                            task.executor.write(pattern.response);
                            setTimeout(() => {
                                if (task.executor?.write) {
                                    task.executor.write('\n');
                                }
                            }, 100);
                        }
                    }
                }
            }, 1000); // Check every second
        }
        if (event === HookEvent.EXECUTION_COMPLETED) {
            logDebug('APPROVAL-MONITOR', `Cleaning up monitoring for task ${taskId}`);
            taskApprovalState.delete(taskId);
        }
        return { action: 'continue' };
    }
};
export default approvalMonitorHook;
//# sourceMappingURL=approval-monitor-hook.js.map