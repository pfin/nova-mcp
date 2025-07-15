/**
 * Axiom MCP v5 - Thought Monitor
 *
 * Real-time pattern detection for Claude's output streams
 */
export { ThoughtMonitor, ThoughtPattern, DetectedThought, ThoughtMonitorConfig, createThoughtMonitor } from './thought-monitor';
export { MonitoredPtyExecutor, MonitoredPtyOptions, createMonitoredPty, monitorClaudeTask } from './pty-integration';
export type PatternType = 'planning' | 'research-loop' | 'todo-violation' | 'success' | 'stall';
export type PatternSeverity = 'info' | 'warning' | 'error' | 'critical';
export type PatternAction = 'log' | 'warn' | 'interrupt' | 'redirect';
/**
 * Preset pattern collections for common use cases
 */
export declare const PRESET_PATTERNS: {
    STRICT_EXECUTION: {
        type: "planning";
        pattern: RegExp;
        description: string;
        severity: "error";
        action: "interrupt";
    }[];
    NO_RESEARCH: {
        type: "research-loop";
        pattern: RegExp;
        description: string;
        severity: "error";
        action: "interrupt";
    }[];
    FORCE_IMPLEMENTATION: {
        type: "todo-violation";
        pattern: RegExp;
        description: string;
        severity: "critical";
        action: "interrupt";
    }[];
};
//# sourceMappingURL=index.d.ts.map