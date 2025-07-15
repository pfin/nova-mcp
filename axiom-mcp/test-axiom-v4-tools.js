#!/usr/bin/env node

// Test script for Axiom MCP V4 tools
console.log("=== Axiom MCP V4 Tool Test ===");
console.log("\nTo test V4 tools:");
console.log("1. Run: npx @modelcontextprotocol/inspector dist-v4/index.js");
console.log("2. Open the browser URL shown");
console.log("3. Try these tool calls:");

console.log("\n--- Test 1: Basic spawn ---");
console.log(`axiom_spawn({
  "prompt": "Write a factorial function in Python",
  "verboseMasterMode": true
})`);

console.log("\n--- Test 2: Parallel execution ---");
console.log(`axiom_spawn({
  "prompt": "Implement user authentication", 
  "spawnPattern": "parallel",
  "spawnCount": 3,
  "verboseMasterMode": true
})`);

console.log("\n--- Test 3: Status check ---");
console.log(`axiom_status({})`);

console.log("\n--- Test 4: Claude orchestration ---");
console.log(`axiom_claude_orchestrate({
  "action": "spawn",
  "instanceId": "test1"
})`);

console.log("\n\nExpected behavior:");
console.log("- axiom_spawn should start tasks and return taskId");
console.log("- axiom_status should show running tasks");
console.log("- axiom_output should retrieve task output");
console.log("- axiom_interrupt should stop tasks");
console.log("- axiom_claude_orchestrate should control Claude instances");