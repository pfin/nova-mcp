/**
 * Parallel Subagents Demo
 * 
 * Complete examples showing different parallel execution patterns
 */

// ============================================
// Example 1: Simple Parallel Execution
// ============================================

console.log("=== Example 1: Build Authentication System ===");

// Launch 3 different authentication implementations
axiom_spawn({
  prompt: "Create complete user authentication system",
  spawnPattern: "parallel",
  spawnCount: 3,
  verboseMasterMode: true
});

// Expected output:
// [task-001] Creating JWT-based authentication...
// [task-002] Building session-based authentication...
// [task-003] Implementing OAuth2 authentication...
//
// Files created:
// - auth-jwt.js (Worker 1)
// - auth-session.js (Worker 2)  
// - auth-oauth.js (Worker 3)

// ============================================
// Example 2: Named Instance Orchestration
// ============================================

console.log("\n=== Example 2: Full-Stack Development Team ===");

// Create a virtual development team
const team = [
  { id: "backend-dev", role: "Backend API Developer" },
  { id: "frontend-dev", role: "React Frontend Developer" },
  { id: "db-admin", role: "Database Administrator" },
  { id: "devops", role: "DevOps Engineer" },
  { id: "qa-tester", role: "QA Test Engineer" }
];

// Spawn all team members
team.forEach(member => {
  axiom_claude_orchestrate({
    action: "spawn",
    instanceId: member.id
  });
  console.log(`✓ Spawned ${member.role} (${member.id})`);
});

// Assign tasks to each team member
setTimeout(() => {
  // Backend developer
  axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "backend-dev",
    prompt: "Create Express.js REST API for a task management app with CRUD operations"
  });

  // Frontend developer
  axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "frontend-dev",
    prompt: "Create React components for task list, task form, and task details"
  });

  // Database admin
  axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "db-admin",
    prompt: "Create PostgreSQL schema for tasks, users, and projects"
  });

  // DevOps engineer
  axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "devops",
    prompt: "Create Docker compose file for the entire stack"
  });

  // QA tester
  axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "qa-tester",
    prompt: "Create Cypress E2E tests for task CRUD operations"
  });
}, 1000);

// ============================================
// Example 3: The Shotgun Pattern
// ============================================

console.log("\n=== Example 3: Multiple Algorithm Implementations ===");

// Try different sorting algorithms simultaneously
const algorithms = [
  "QuickSort with median-of-three pivot",
  "MergeSort with iterative approach",
  "HeapSort with in-place sorting",
  "RadixSort for integer arrays",
  "TimSort (Python's sorting algorithm)"
];

algorithms.forEach((algo, index) => {
  axiom_spawn({
    prompt: `Implement ${algo} in JavaScript with performance benchmarks`,
    verboseMasterMode: true
  });
});

// Result: 5 different sorting implementations to benchmark

// ============================================
// Example 4: Microservices Architecture
// ============================================

console.log("\n=== Example 4: Build Microservices ===");

const microservices = {
  "user-service": "User management with registration, profile, and preferences",
  "auth-service": "JWT authentication with refresh tokens and revocation",
  "product-service": "Product catalog with search and filtering",
  "order-service": "Order processing with payment integration",
  "notification-service": "Email and SMS notifications with templates"
};

// Create all microservices in parallel
Object.entries(microservices).forEach(([service, description]) => {
  axiom_spawn({
    prompt: `Create ${service}: ${description}. Include Dockerfile and tests.`,
    verboseMasterMode: true
  });
});

// ============================================
// Example 5: Peer Review Pattern
// ============================================

console.log("\n=== Example 5: Developer + Reviewer Pattern ===");

// Spawn developer and reviewer
axiom_claude_orchestrate({
  action: "spawn",
  instanceId: "senior-dev"
});

axiom_claude_orchestrate({
  action: "spawn",
  instanceId: "code-reviewer"
});

// Developer creates code
axiom_claude_orchestrate({
  action: "prompt",
  instanceId: "senior-dev",
  prompt: "Create a secure password hashing utility with bcrypt"
});

// After 20 seconds, reviewer checks the code
setTimeout(() => {
  axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "code-reviewer",
    prompt: "Review password-hash.js for security vulnerabilities and best practices"
  });
}, 20000);

// After 40 seconds, developer can implement feedback
setTimeout(() => {
  axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "senior-dev",
    prompt: "Update password-hash.js based on the security review feedback"
  });
}, 40000);

// ============================================
// Example 6: Assembly Line Pattern
// ============================================

console.log("\n=== Example 6: Sequential Pipeline ===");

// Each stage depends on the previous one
const pipeline = async () => {
  // Stage 1: Design API
  const designer = await axiom_claude_orchestrate({
    action: "spawn",
    instanceId: "api-designer"
  });
  
  await axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "api-designer",
    prompt: "Create OpenAPI 3.0 specification for a blog API"
  });
  
  // Wait for design to complete
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Stage 2: Generate server code
  await axiom_claude_orchestrate({
    action: "spawn",
    instanceId: "code-generator"
  });
  
  await axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "code-generator",
    prompt: "Generate Express.js server code from openapi.yaml"
  });
  
  // Stage 3: Create tests
  await axiom_claude_orchestrate({
    action: "spawn",
    instanceId: "test-generator"
  });
  
  await axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "test-generator",
    prompt: "Generate Postman collection from openapi.yaml"
  });
};

// ============================================
// Example 7: Monitoring and Status
// ============================================

console.log("\n=== Example 7: Monitor All Tasks ===");

// Function to check all running tasks
const monitorTasks = async () => {
  // Get overall status
  const status = await axiom_status({});
  console.log(`\nActive tasks: ${status.tasks.filter(t => t.status === 'running').length}`);
  
  // Check specific instances
  const instances = ["backend-dev", "frontend-dev", "db-admin"];
  
  for (const id of instances) {
    const instanceStatus = await axiom_claude_orchestrate({
      action: "status",
      instanceId: id
    });
    console.log(`${id}: ${instanceStatus}`);
  }
};

// Monitor every 10 seconds
setInterval(monitorTasks, 10000);

// ============================================
// Example 8: Intelligent Steering
// ============================================

console.log("\n=== Example 8: Dynamic Intervention ===");

// Start a task
axiom_claude_orchestrate({
  action: "spawn",
  instanceId: "dynamic-dev"
});

axiom_claude_orchestrate({
  action: "prompt",
  instanceId: "dynamic-dev",
  prompt: "Create a web scraper for news articles"
});

// Monitor and steer based on output
const steerIfNeeded = async () => {
  const output = await axiom_claude_orchestrate({
    action: "get_output",
    instanceId: "dynamic-dev",
    lines: 50
  });
  
  // Check if using the wrong library
  if (output.includes("puppeteer") && output.includes("import")) {
    console.log("❌ Detected Puppeteer - steering to use cheerio instead");
    
    await axiom_claude_orchestrate({
      action: "steer",
      instanceId: "dynamic-dev",
      prompt: "Actually, use cheerio instead of puppeteer for better performance"
    });
  }
  
  // Check if forgetting error handling
  if (output.includes("fetch(") && !output.includes("catch")) {
    console.log("⚠️ Missing error handling - adding intervention");
    
    await axiom_claude_orchestrate({
      action: "steer",
      instanceId: "dynamic-dev",
      prompt: "Add proper error handling for all network requests"
    });
  }
};

// Check every 5 seconds during execution
const steerInterval = setInterval(steerIfNeeded, 5000);

// Stop monitoring after 2 minutes
setTimeout(() => clearInterval(steerInterval), 120000);