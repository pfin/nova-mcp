/**
 * Example usage of ThoughtMonitor with PTY streams
 */
import { createThoughtMonitor, DetectedThought } from './thought-monitor';
declare function monitorClaudeExecution(): {
    pty: import("node-pty").IPty;
    monitor: import("./thought-monitor").ThoughtMonitor;
};
declare function addCustomPatterns(monitor: ReturnType<typeof createThoughtMonitor>): void;
declare function setupInterventionSystem(): import("./thought-monitor").ThoughtMonitor;
declare function processCapturedOutput(output: string): {
    totalDetections: number;
    byType: Record<string, number>;
    criticalIssues: DetectedThought[];
    requiresIntervention: DetectedThought[];
};
export { monitorClaudeExecution, addCustomPatterns, setupInterventionSystem, processCapturedOutput };
//# sourceMappingURL=thought-monitor.example.d.ts.map