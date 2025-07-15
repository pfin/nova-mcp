"use strict";
/**
 * Integration between ThoughtMonitor and PTY Executor
 * Shows how to wire the monitor into Axiom MCP's execution flow
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoredPtyExecutor = void 0;
exports.createMonitoredPty = createMonitoredPty;
exports.monitorClaudeTask = monitorClaudeTask;
const pty = __importStar(require("node-pty"));
const thought_monitor_1 = require("./thought-monitor");
class MonitoredPtyExecutor {
    pty;
    options;
    monitor;
    interruptCount = 0;
    successCount = 0;
    warningCount = 0;
    constructor(pty, options = {}) {
        this.pty = pty;
        this.options = options;
        this.monitor = (0, thought_monitor_1.createThoughtMonitor)({
            debugMode: false,
            stallTimeout: 30000
        });
        this.setupMonitoring();
        this.addCustomPatterns();
    }
    setupMonitoring() {
        // Wire PTY output to monitor
        this.pty.onData((data) => {
            // Feed each character to monitor
            for (const char of data) {
                this.monitor.processChar(char);
            }
        });
        // Handle interrupts
        this.monitor.on('interrupt-required', (detection) => {
            this.interruptCount++;
            if (this.options.onInterrupt) {
                this.options.onInterrupt(detection);
            }
            if (this.options.autoInterrupt) {
                console.log(`[Monitor] Auto-interrupting due to: ${detection.pattern.description}`);
                this.sendInterrupt();
                // Send corrective message after a short delay
                setTimeout(() => {
                    this.sendCorrectiveMessage(detection);
                }, 500);
            }
        });
        // Handle warnings
        this.monitor.on('warning', (detection) => {
            this.warningCount++;
            if (this.options.onWarning) {
                this.options.onWarning(detection);
            }
        });
        // Handle successes
        this.monitor.on('pattern:success', (detection) => {
            this.successCount++;
            if (this.options.onSuccess) {
                this.options.onSuccess(detection);
            }
        });
        // Log stalls
        this.monitor.on('pattern:stall', (detection) => {
            console.error(`[Monitor] Process stalled: ${detection.pattern.description}`);
            if (this.options.autoInterrupt) {
                this.sendInterrupt();
                setTimeout(() => {
                    this.pty.write('What specific file should we create next?\n');
                }, 500);
            }
        });
    }
    addCustomPatterns() {
        if (this.options.customPatterns) {
            this.options.customPatterns.forEach(pattern => {
                this.monitor.addPattern(pattern);
            });
        }
    }
    sendInterrupt() {
        // Send Ctrl+C to PTY
        this.pty.write('\x03');
    }
    sendCorrectiveMessage(detection) {
        const messages = {
            'todo-violation': 'Stop writing TODOs. Implement the actual code now. No placeholders.',
            'research-loop': 'You have enough information. Stop researching and start implementing.',
            'planning': 'Stop planning. Start implementing actual code right now.',
            'stall': 'What specific file should we create next? Choose one and implement it.'
        };
        const message = messages[detection.pattern.type] || 'Focus on implementation, not planning.';
        this.pty.write(`\n${message}\n`);
    }
    /**
     * Send input to the PTY
     */
    write(data) {
        this.pty.write(data);
    }
    /**
     * Get monitoring statistics
     */
    getStats() {
        return {
            interrupts: this.interruptCount,
            warnings: this.warningCount,
            successes: this.successCount,
            monitorStats: this.monitor.getStats()
        };
    }
    /**
     * Clean up resources
     */
    destroy() {
        this.monitor.destroy();
    }
}
exports.MonitoredPtyExecutor = MonitoredPtyExecutor;
/**
 * Factory function to create a monitored PTY process
 */
function createMonitoredPty(command, args, options = {}) {
    const ptyProcess = pty.spawn(command, args, {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: process.env
    });
    const executor = new MonitoredPtyExecutor(ptyProcess, options);
    return { executor, pty: ptyProcess };
}
/**
 * Example: Monitor a Claude execution with auto-intervention
 */
function monitorClaudeTask(prompt) {
    const { executor, pty } = createMonitoredPty('claude', ['--print', prompt], {
        autoInterrupt: true,
        onInterrupt: (detection) => {
            console.log(`\n🚨 Intervention: ${detection.pattern.type}`);
            console.log(`   Reason: ${detection.pattern.description}`);
            console.log(`   Matched: "${detection.matched}"`);
        },
        onSuccess: (detection) => {
            console.log(`\n✅ Progress: ${detection.pattern.description}`);
        },
        customPatterns: [
            {
                type: 'planning', // Use an existing type
                pattern: /\b(cannot|unable to|don't have access|can't)\b/i,
                description: 'Making excuses instead of trying',
                severity: 'warning',
                action: 'warn'
            }
        ]
    });
    // Handle PTY exit
    pty.onExit(({ exitCode }) => {
        const stats = executor.getStats();
        console.log(`\n=== Execution Summary ===`);
        console.log(`Exit code: ${exitCode}`);
        console.log(`Interventions: ${stats.interrupts}`);
        console.log(`Warnings: ${stats.warnings}`);
        console.log(`Successes: ${stats.successes}`);
        console.log(`Characters processed: ${stats.monitorStats.streamPosition}`);
        executor.destroy();
    });
    return { executor, pty };
}
//# sourceMappingURL=pty-integration.js.map