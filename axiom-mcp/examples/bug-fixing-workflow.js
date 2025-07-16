/**
 * Bug Fixing Workflow Example
 * 
 * Use Axiom to quickly fix bugs without analysis paralysis.
 */

// Scenario: Memory leak in WebSocket handler
axiom_spawn({
  prompt: "Fix the memory leak in websocket.js where connections aren't cleaned up",
  verboseMasterMode: true
});

// What Axiom prevents:
// ❌ "Let me analyze the potential causes of memory leaks..."
// ❌ "I would investigate the connection lifecycle..."
// ❌ "The best approach would be to first understand..."

// What Axiom enforces:
// ✅ Immediate code inspection
// ✅ Direct fix implementation
// ✅ Updated websocket.js with cleanup code

// Advanced: Parallel debugging approaches
axiom_spawn({
  prompt: "Fix WebSocket memory leak",
  spawnPattern: "parallel",
  spawnCount: 3
});

// Worker 1: Adds connection.on('close') cleanup
// Worker 2: Implements WeakMap for connection tracking
// Worker 3: Uses connection pooling with limits

// Result: 3 different fixes in 2 minutes
// Test each and deploy the most robust solution