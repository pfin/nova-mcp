/**
 * Complex Project Decomposition Example
 * 
 * Build an entire e-commerce MVP using orthogonal decomposition
 * and parallel execution.
 */

// Step 1: Decompose into orthogonal tasks (5-10 min each)
const tasks = [
  "Create Express.js server with basic routes",
  "Build user authentication with JWT",
  "Implement product catalog with search",
  "Create shopping cart with Redis session",
  "Add Stripe payment integration",
  "Build React frontend components",
  "Create PostgreSQL database schema"
];

// Step 2: Execute in parallel batches
// First batch - Infrastructure
axiom_spawn({
  prompt: tasks[0], // Server
  verboseMasterMode: true
});

axiom_spawn({
  prompt: tasks[6], // Database
  verboseMasterMode: true
});

// Wait for infrastructure...

// Second batch - Core features
tasks.slice(1, 5).forEach(task => {
  axiom_spawn({
    prompt: task,
    verboseMasterMode: true
  });
});

// Third batch - Frontend
axiom_spawn({
  prompt: tasks[5],
  spawnPattern: "parallel",
  spawnCount: 3 // Header, ProductList, Cart components
});

// Total time: ~2 hours for complete MVP
// Traditional approach: 2-4 weeks

// Key insights:
// 1. Each task is independent (orthogonal)
// 2. 5-10 minute scope prevents drift
// 3. Parallel execution maximizes throughput
// 4. Real files created, not plans