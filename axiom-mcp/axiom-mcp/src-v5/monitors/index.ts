/**
 * Axiom MCP v5 - Thought Monitor
 * 
 * Real-time pattern detection for Claude's output streams
 */

export {
  ThoughtMonitor,
  ThoughtPattern,
  DetectedThought,
  ThoughtMonitorConfig,
  createThoughtMonitor
} from './thought-monitor';

export {
  MonitoredPtyExecutor,
  MonitoredPtyOptions,
  createMonitoredPty,
  monitorClaudeTask
} from './pty-integration';

// Re-export common pattern types for convenience
export type PatternType = 'planning' | 'research-loop' | 'todo-violation' | 'success' | 'stall';
export type PatternSeverity = 'info' | 'warning' | 'error' | 'critical';
export type PatternAction = 'log' | 'warn' | 'interrupt' | 'redirect';

/**
 * Preset pattern collections for common use cases
 */
export const PRESET_PATTERNS = {
  // Strict execution mode - no planning allowed
  STRICT_EXECUTION: [
    {
      type: 'planning' as const,
      pattern: /\b(would|could|should|might|planning|approach|strategy)\b/i,
      description: 'Planning language detected',
      severity: 'error' as const,
      action: 'interrupt' as const
    }
  ],
  
  // Research prevention mode
  NO_RESEARCH: [
    {
      type: 'research-loop' as const,
      pattern: /\b(check|verify|look at|examine|investigate|understand)\b.*\b(again|more|further)\b/i,
      description: 'Repeated research detected',
      severity: 'error' as const,
      action: 'interrupt' as const
    }
  ],
  
  // Implementation enforcement
  FORCE_IMPLEMENTATION: [
    {
      type: 'todo-violation' as const,
      pattern: /\b(TODO|FIXME|XXX|HACK|implement later|not implemented|placeholder)\b/i,
      description: 'Incomplete implementation detected',
      severity: 'critical' as const,
      action: 'interrupt' as const
    }
  ]
};