"use strict";
/**
 * Example usage of ThoughtMonitor with PTY streams
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorClaudeExecution = monitorClaudeExecution;
exports.addCustomPatterns = addCustomPatterns;
exports.setupInterventionSystem = setupInterventionSystem;
exports.processCapturedOutput = processCapturedOutput;
const node_pty_1 = require("node-pty");
const thought_monitor_1 = require("./thought-monitor");
// Example 1: Basic usage with PTY stream
function monitorClaudeExecution() {
    // Create monitor with debug mode
    const monitor = (0, thought_monitor_1.createThoughtMonitor)({
        debugMode: true,
        stallTimeout: 30000, // 30 seconds
        contextWindow: 150
    });
    // Set up event handlers
    monitor.on('pattern:planning', (detection) => {
        console.warn(`⚠️  Planning detected: "${detection.matched}"`);
        console.warn(`   Context: ${detection.context}`);
    });
    monitor.on('pattern:research-loop', (detection) => {
        console.error(`🔄 Research loop: ${detection.pattern.description}`);
    });
    monitor.on('pattern:todo-violation', (detection) => {
        console.error(`❌ TODO violation: "${detection.matched}"`);
        console.error(`   This requires immediate intervention!`);
    });
    monitor.on('pattern:success', (detection) => {
        console.log(`✅ Success: ${detection.pattern.description}`);
    });
    monitor.on('pattern:stall', (detection) => {
        console.error(`⏱️  Stall detected: ${detection.pattern.description}`);
    });
    monitor.on('interrupt-required', (detection) => {
        console.error(`🚨 INTERRUPT REQUIRED: ${detection.pattern.type}`);
        // Here you would send Ctrl+C or other interrupt signal to PTY
    });
    // Spawn Claude process (example)
    const pty = (0, node_pty_1.spawn)('claude', ['--print', 'implement a todo app'], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: process.env
    });
    // Feed PTY output to monitor character by character
    pty.onData((data) => {
        // Process each character
        for (const char of data) {
            monitor.processChar(char);
        }
    });
    // Handle PTY exit
    pty.onExit(({ exitCode }) => {
        console.log(`Process exited with code ${exitCode}`);
        // Get final stats
        const stats = monitor.getStats();
        console.log('\nMonitor Statistics:');
        console.log(`- Stream position: ${stats.streamPosition} characters`);
        console.log(`- Detection counts:`, stats.detectionCounts);
        // Clean up
        monitor.destroy();
    });
    return { pty, monitor };
}
// Example 2: Custom pattern addition
function addCustomPatterns(monitor) {
    // Add pattern for detecting when Claude is getting philosophical
    monitor.addPattern({
        type: 'planning',
        pattern: /\b(fundamentally|essentially|conceptually|philosophically)\b/i,
        description: 'Detected abstract thinking instead of concrete implementation',
        severity: 'warning',
        action: 'warn'
    });
    // Add pattern for detecting excuse-making
    monitor.addPattern({
        type: 'planning',
        pattern: /\b(due to|because of|limited by|constrained by)\b/i,
        description: 'Detected excuse-making behavior',
        severity: 'warning',
        action: 'warn'
    });
    // Add pattern for successful code generation
    monitor.addPattern({
        type: 'success',
        pattern: /```[\w]*\n[\s\S]+?\n```/,
        description: 'Detected code block generation',
        severity: 'info',
        action: 'log'
    });
}
// Example 3: Integration with intervention system
function setupInterventionSystem() {
    const monitor = (0, thought_monitor_1.createThoughtMonitor)();
    monitor.on('interrupt-required', async (detection) => {
        console.log(`Intervention needed: ${detection.pattern.type}`);
        switch (detection.pattern.type) {
            case 'todo-violation':
                // Send redirect message
                console.log('Sending: "Stop creating TODOs. Implement the actual code now."');
                break;
            case 'research-loop':
                // Break the loop
                console.log('Sending: "You have enough information. Start implementing now."');
                break;
            case 'stall':
                // Prompt for action
                console.log('Sending: "What specific file should we create next?"');
                break;
        }
    });
    return monitor;
}
// Example 4: Batch processing mode
function processCapturedOutput(output) {
    const monitor = (0, thought_monitor_1.createThoughtMonitor)({
        debugMode: false
    });
    const detections = [];
    monitor.on('detection', (detection) => {
        detections.push(detection);
    });
    // Process the entire output
    monitor.processChunk(output);
    // Analyze results
    const summary = {
        totalDetections: detections.length,
        byType: {},
        criticalIssues: detections.filter(d => d.pattern.severity === 'critical'),
        requiresIntervention: detections.filter(d => d.pattern.action === 'interrupt' || d.pattern.action === 'redirect')
    };
    detections.forEach(d => {
        summary.byType[d.pattern.type] = (summary.byType[d.pattern.type] || 0) + 1;
    });
    monitor.destroy();
    return summary;
}
//# sourceMappingURL=thought-monitor.example.js.map