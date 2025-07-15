/**
 * Example usage of ThoughtMonitor with PTY streams
 */

import { spawn } from 'node-pty';
import { createThoughtMonitor, DetectedThought } from './thought-monitor';

// Example 1: Basic usage with PTY stream
function monitorClaudeExecution() {
  // Create monitor with debug mode
  const monitor = createThoughtMonitor({
    debugMode: true,
    stallTimeout: 30000, // 30 seconds
    contextWindow: 150
  });
  
  // Set up event handlers
  monitor.on('pattern:planning', (detection: DetectedThought) => {
    console.warn(`⚠️  Planning detected: "${detection.matched}"`);
    console.warn(`   Context: ${detection.context}`);
  });
  
  monitor.on('pattern:research-loop', (detection: DetectedThought) => {
    console.error(`🔄 Research loop: ${detection.pattern.description}`);
  });
  
  monitor.on('pattern:todo-violation', (detection: DetectedThought) => {
    console.error(`❌ TODO violation: "${detection.matched}"`);
    console.error(`   This requires immediate intervention!`);
  });
  
  monitor.on('pattern:success', (detection: DetectedThought) => {
    console.log(`✅ Success: ${detection.pattern.description}`);
  });
  
  monitor.on('pattern:stall', (detection: DetectedThought) => {
    console.error(`⏱️  Stall detected: ${detection.pattern.description}`);
  });
  
  monitor.on('interrupt-required', (detection: DetectedThought) => {
    console.error(`🚨 INTERRUPT REQUIRED: ${detection.pattern.type}`);
    // Here you would send Ctrl+C or other interrupt signal to PTY
  });
  
  // Spawn Claude process (example)
  const pty = spawn('claude', ['--print', 'implement a todo app'], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
  });
  
  // Feed PTY output to monitor character by character
  pty.onData((data: string) => {
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
function addCustomPatterns(monitor: ReturnType<typeof createThoughtMonitor>) {
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
  const monitor = createThoughtMonitor();
  
  monitor.on('interrupt-required', async (detection: DetectedThought) => {
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
function processCapturedOutput(output: string) {
  const monitor = createThoughtMonitor({
    debugMode: false
  });
  
  const detections: DetectedThought[] = [];
  
  monitor.on('detection', (detection: DetectedThought) => {
    detections.push(detection);
  });
  
  // Process the entire output
  monitor.processChunk(output);
  
  // Analyze results
  const summary = {
    totalDetections: detections.length,
    byType: {} as Record<string, number>,
    criticalIssues: detections.filter(d => d.pattern.severity === 'critical'),
    requiresIntervention: detections.filter(d => 
      d.pattern.action === 'interrupt' || d.pattern.action === 'redirect'
    )
  };
  
  detections.forEach(d => {
    summary.byType[d.pattern.type] = (summary.byType[d.pattern.type] || 0) + 1;
  });
  
  monitor.destroy();
  return summary;
}

// Export examples
export {
  monitorClaudeExecution,
  addCustomPatterns,
  setupInterventionSystem,
  processCapturedOutput
};