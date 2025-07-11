/**
 * Task Monitor Hook - Checks task status every 15 seconds
 * Detects stuck tasks and intervenes automatically
 */

import { Hook, HookContext, HookResult, HookEvent } from '../core/hook-orchestrator.js';
import { logDebug } from '../core/simple-logger.js';

// Track monitoring intervals
const taskMonitors = new Map<string, NodeJS.Timeout>();
const taskLastProgress = new Map<string, { lines: number; timestamp: number }>();

// Patterns that indicate a stuck task
const stuckPatterns = [
  /^\[?2004h/,  // Terminal escape codes repeating
  /Auto-updating to v[\d.]+/,  // Claude update stuck
  /◯ Use \/ide to connect/,  // Idle prompt
];

export const taskMonitorHook: Hook = {
  name: 'task-monitor-hook',
  events: [HookEvent.EXECUTION_STARTED, HookEvent.EXECUTION_COMPLETED, HookEvent.EXECUTION_FAILED],
  priority: 85,

  handler: async (context: HookContext): Promise<HookResult> => {
    const { event, execution } = context;
    
    if (!execution?.taskId) {
      return { action: 'continue' };
    }

    const taskId = execution.taskId;

    if (event === HookEvent.EXECUTION_STARTED) {
      logDebug('TASK-MONITOR', `Starting monitoring for task ${taskId}`);
      
      // Clear any existing monitor
      if (taskMonitors.has(taskId)) {
        clearInterval(taskMonitors.get(taskId)!);
      }

      // Set up 15-second monitoring
      const monitor = setInterval(async () => {
        try {
          // Get task from orchestrator
          const orchestrator = context.db?.hookOrchestrator || context.eventBus?.hookOrchestrator;
          const task = orchestrator?.getActiveTask?.(taskId);
          if (!task || task.status !== 'running') {
            logDebug('TASK-MONITOR', `Task ${taskId} no longer running, stopping monitor`);
            clearInterval(monitor);
            taskMonitors.delete(taskId);
            taskLastProgress.delete(taskId);
            return;
          }

          const currentLines = task.output?.split('\n').length || 0;
          const lastCheck = taskLastProgress.get(taskId);
          const now = Date.now();

          logDebug('TASK-MONITOR', `Checking task ${taskId}: ${currentLines} lines, runtime: ${now - task.startTime}ms`);

          // Check if task is making progress
          if (lastCheck) {
            const timeSinceLastProgress = now - lastCheck.timestamp;
            const linesAdded = currentLines - lastCheck.lines;

            // If no new output for 30 seconds, check for stuck patterns
            if (linesAdded === 0 && timeSinceLastProgress > 30000) {
              logDebug('TASK-MONITOR', `Task ${taskId} has no new output for ${timeSinceLastProgress}ms`);
              
              // Check recent output for stuck patterns
              const recentOutput = task.output.slice(-500);
              const isStuck = stuckPatterns.some(pattern => pattern.test(recentOutput));

              if (isStuck) {
                logDebug('TASK-MONITOR', `Task ${taskId} appears stuck! Attempting intervention`);
                
                // Send intervention
                if (task.executor?.write) {
                  task.executor.write('\n');  // Try Enter first
                  setTimeout(() => {
                    if (task.executor?.write) {
                      task.executor.write('quit\n');  // Then quit
                    }
                  }, 1000);
                }

                // Notify through stream
                if (context.eventBus) {
                  context.eventBus.emit('task:stuck', {
                    taskId,
                    runtime: now - task.startTime,
                    lastOutput: recentOutput.slice(-200)
                  });
                }
              }
            }

            // If no progress for 60 seconds, consider force stopping
            if (linesAdded === 0 && timeSinceLastProgress > 60000) {
              logDebug('TASK-MONITOR', `Task ${taskId} has been stuck for 60s, recommending termination`);
              
              if (task.executor?.interrupt) {
                task.executor.interrupt();
              }
            }
          }

          // Update progress tracking
          taskLastProgress.set(taskId, { lines: currentLines, timestamp: now });

          // Check if task has been running too long (10 minutes)
          if (now - task.startTime > 600000) {
            logDebug('TASK-MONITOR', `Task ${taskId} exceeded 10 minute limit`);
            
            if (task.executor?.interrupt) {
              task.executor.interrupt();
              setTimeout(() => {
                if (task.executor?.write) {
                  task.executor.write('exit\n');
                }
              }, 1000);
            }
          }

        } catch (error) {
          logDebug('TASK-MONITOR', `Error monitoring task ${taskId}:`, error);
        }
      }, 15000); // Check every 15 seconds

      taskMonitors.set(taskId, monitor);
      taskLastProgress.set(taskId, { lines: 0, timestamp: Date.now() });
    }

    // Clean up on completion/failure
    if (event === HookEvent.EXECUTION_COMPLETED || event === HookEvent.EXECUTION_FAILED) {
      logDebug('TASK-MONITOR', `Stopping monitor for completed task ${taskId}`);
      
      if (taskMonitors.has(taskId)) {
        clearInterval(taskMonitors.get(taskId)!);
        taskMonitors.delete(taskId);
        taskLastProgress.delete(taskId);
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

export default taskMonitorHook;