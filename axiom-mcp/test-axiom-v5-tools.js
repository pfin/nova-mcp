#!/usr/bin/env node

// Test script for Axiom MCP V5 Shadow Protocol tools
console.log("=== Axiom MCP V5 Shadow Protocol Tool Test ===");
console.log("\nTo test V5 tools:");
console.log("1. Run: npx @modelcontextprotocol/inspector dist-v5/src-v5/index-server.js");
console.log("2. Open the browser URL shown");
console.log("3. Try these tool calls:");

console.log("\n--- Test 1: Full cycle execution ---");
console.log(`axiom_v5_execute({
  "prompt": "Build a distributed cache with Redis",
  "mode": "full",
  "aggressiveness": 0.8,
  "parallelism": 5,
  "workspace": "/tmp/axiom-v5"
})`);

console.log("\n--- Test 2: Monitor instances ---");
console.log(`axiom_v5_monitor({
  "action": "status"
})`);

console.log("\n--- Test 3: Glitch mutation ---");
console.log(`axiom_v5_glitch({
  "type": "mutate_prompt",
  "intensity": 0.7,
  "target": "execution_phase"
})`);

console.log("\n\nV5 Philosophy:");
console.log("- Tool starvation forces creation");
console.log("- Automatic interruption of 'I would...' patterns");
console.log("- Parallel execution with orthogonal tasks");
console.log("- Real-time productivity monitoring");
console.log("- The weak must fall!");