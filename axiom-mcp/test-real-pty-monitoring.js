#!/usr/bin/env node

import { PtyExecutor } from './dist-v4/executors/pty-executor.js';
import { EventEmitter } from 'events';

console.log("=== REAL PTY MONITORING DEMO ===\n");
console.log("This demonstrates actual character-by-character monitoring\n");

// Create a mock hook orchestrator for demo
class DemoHookOrchestrator extends EventEmitter {
  async triggerHooks(event, data) {
    // Log what we see
    if (event === 'EXECUTION_STREAM' && data.stream) {
      process.stdout.write(data.stream.data);
      
      // Check for planning patterns
      if (data.stream.data.includes("I'll analyze") || 
          data.stream.data.includes("I would") ||
          data.stream.data.includes("Let me think")) {
        
        console.log("\n\n🚨 [AXIOM DETECTED PLANNING PATTERN]");
        console.log("   Pattern: '" + data.stream.data.trim() + "'");
        console.log("   Action: Injecting intervention...\n");
        
        return {
          modifications: {
            command: "\n[AXIOM INTERRUPT] Stop planning! Create the file NOW!\n"
          }
        };
      }
    }
    return {};
  }
}

// Create PTY executor with hook orchestrator
const hookOrchestrator = new DemoHookOrchestrator();
const executor = new PtyExecutor({
  shell: 'bash',
  cwd: '/tmp',
  enableMonitoring: true,
  hookOrchestrator: hookOrchestrator
});

// Test prompt that will trigger planning
const testPrompt = "Write a web scraper for news articles";
const systemPrompt = "You are a helpful coding assistant.";

console.log("📋 Task: " + testPrompt);
console.log("\n🔍 MONITORING CHARACTER-BY-CHARACTER OUTPUT:");
console.log("─".repeat(50) + "\n");

// Character counter
let charCount = 0;
const streamHandler = (data) => {
  charCount += data.length;
  // Already printed by hook orchestrator
};

// Execute with monitoring
executor.execute(testPrompt, systemPrompt, "demo-001", streamHandler)
  .then(output => {
    console.log("\n\n✅ EXECUTION COMPLETE");
    console.log("─".repeat(50));
    console.log("Total characters monitored: " + charCount);
    console.log("Output length: " + output.length);
    process.exit(0);
  })
  .catch(err => {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  });

// Show real-time monitoring
let dots = 0;
const monitor = setInterval(() => {
  if (executor.isRunning()) {
    process.stdout.write(".");
    dots++;
    if (dots > 50) {
      process.stdout.write("\n");
      dots = 0;
    }
  } else {
    clearInterval(monitor);
  }
}, 100);