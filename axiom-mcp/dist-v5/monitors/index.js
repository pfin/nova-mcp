"use strict";
/**
 * Axiom MCP v5 - Thought Monitor
 *
 * Real-time pattern detection for Claude's output streams
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRESET_PATTERNS = exports.monitorClaudeTask = exports.createMonitoredPty = exports.MonitoredPtyExecutor = exports.createThoughtMonitor = exports.ThoughtMonitor = void 0;
var thought_monitor_1 = require("./thought-monitor");
Object.defineProperty(exports, "ThoughtMonitor", { enumerable: true, get: function () { return thought_monitor_1.ThoughtMonitor; } });
Object.defineProperty(exports, "createThoughtMonitor", { enumerable: true, get: function () { return thought_monitor_1.createThoughtMonitor; } });
var pty_integration_1 = require("./pty-integration");
Object.defineProperty(exports, "MonitoredPtyExecutor", { enumerable: true, get: function () { return pty_integration_1.MonitoredPtyExecutor; } });
Object.defineProperty(exports, "createMonitoredPty", { enumerable: true, get: function () { return pty_integration_1.createMonitoredPty; } });
Object.defineProperty(exports, "monitorClaudeTask", { enumerable: true, get: function () { return pty_integration_1.monitorClaudeTask; } });
/**
 * Preset pattern collections for common use cases
 */
exports.PRESET_PATTERNS = {
    // Strict execution mode - no planning allowed
    STRICT_EXECUTION: [
        {
            type: 'planning',
            pattern: /\b(would|could|should|might|planning|approach|strategy)\b/i,
            description: 'Planning language detected',
            severity: 'error',
            action: 'interrupt'
        }
    ],
    // Research prevention mode
    NO_RESEARCH: [
        {
            type: 'research-loop',
            pattern: /\b(check|verify|look at|examine|investigate|understand)\b.*\b(again|more|further)\b/i,
            description: 'Repeated research detected',
            severity: 'error',
            action: 'interrupt'
        }
    ],
    // Implementation enforcement
    FORCE_IMPLEMENTATION: [
        {
            type: 'todo-violation',
            pattern: /\b(TODO|FIXME|XXX|HACK|implement later|not implemented|placeholder)\b/i,
            description: 'Incomplete implementation detected',
            severity: 'critical',
            action: 'interrupt'
        }
    ]
};
//# sourceMappingURL=index.js.map