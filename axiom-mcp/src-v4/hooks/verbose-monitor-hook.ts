/**
 * Verbose Monitor Hook - Enables real-time streaming
 * Shows how v4 connects previously orphaned components
 */

import { Hook, HookContext, HookResult, HookEvent } from '../core/hook-orchestrator.js';

// This would import the actual VerboseMonitor
// import { VerboseMonitor } from '../monitors/verbose-monitor.js';

const activeMonitors = new Map<string, any>();

export const verboseMonitorHook: Hook = {
  name: 'verbose-monitor-hook',
  events: [
    HookEvent.EXECUTION_STARTED,
    HookEvent.EXECUTION_STREAM,
    HookEvent.EXECUTION_COMPLETED
  ],
  priority: 90,
  
  handler: async (context: HookContext): Promise<HookResult> => {
    const { event, execution, stream, request } = context;
    
    // Check if verbose mode is enabled
    const isVerbose = request?.args?.verboseMasterMode === true;
    
    if (!isVerbose) {
      return { action: 'continue' };
    }
    
    switch (event) {
      case HookEvent.EXECUTION_STARTED:
        // Create monitor for this execution
        console.error(`\n[VERBOSE MODE] Starting execution: ${execution!.taskId}\n`);
        
        // In real implementation, create VerboseMonitor instance
        activeMonitors.set(execution!.taskId, {
          startTime: Date.now(),
          chunks: []
        });
        
        break;
        
      case HookEvent.EXECUTION_STREAM:
        // Process stream in real-time
        const monitor = activeMonitors.get(execution!.taskId);
        if (monitor && stream) {
          // Real-time output with colors
          const prefix = `[${execution!.taskId.slice(-8)}]`;
          const colored = colorizeOutput(stream.data);
          
          // Output to console
          process.stderr.write(`${prefix} ${colored}`);
          
          // Store for aggregation
          monitor.chunks.push(stream.data);
          
          // Pattern detection
          if (/error|failed/i.test(stream.data)) {
            return {
              action: 'modify',
              modifications: {
                intervention: 'error_detected',
                command: '# Error detected - intervention may be needed\n'
              }
            };
          }
        }
        break;
        
      case HookEvent.EXECUTION_COMPLETED:
        // Clean up monitor
        const finalMonitor = activeMonitors.get(execution!.taskId);
        if (finalMonitor) {
          const duration = Date.now() - finalMonitor.startTime;
          console.error(`\n[VERBOSE MODE] Completed in ${duration}ms\n`);
          activeMonitors.delete(execution!.taskId);
        }
        break;
    }
    
    return { action: 'continue' };
  }
};

function colorizeOutput(text: string): string {
  // Color coding for different patterns
  return text
    .replace(/\b(error|failed|failure)\b/gi, '\x1b[31m$1\x1b[0m') // Red
    .replace(/\b(success|passed|created|updated)\b/gi, '\x1b[32m$1\x1b[0m') // Green
    .replace(/\b(warning|todo|fixme)\b/gi, '\x1b[33m$1\x1b[0m') // Yellow
    .replace(/\b(info|note)\b/gi, '\x1b[34m$1\x1b[0m'); // Blue
}

export default verboseMonitorHook;