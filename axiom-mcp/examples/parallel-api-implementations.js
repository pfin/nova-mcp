/**
 * Parallel API Implementation Example
 * 
 * Build 3 different REST API implementations simultaneously
 * and pick the best one.
 */

// Launch 3 parallel workers
axiom_spawn({
  prompt: "Create a user management REST API with authentication",
  spawnPattern: "parallel",
  spawnCount: 3,
  verboseMasterMode: true
});

// What happens:
// - Worker 1: Might build with Express.js + JWT
// - Worker 2: Might use Fastify + Sessions  
// - Worker 3: Might implement with Koa + OAuth2
//
// All 3 execute in parallel with real-time monitoring:
// [task-123] Creating Express server...
// [task-456] Setting up Fastify routes...
// [task-789] Implementing Koa middleware...
//
// If any worker starts planning:
// [task-456] [INTERVENTION] Stop analyzing! Write code now!
//
// Result: 3 working implementations in ~90 seconds
// Choose the best one for your needs!