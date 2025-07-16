# Axiom MCP Parallel Subagents Guide

> **Multiply your productivity** by running multiple AI agents simultaneously, each working on different aspects of your project.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Basic Parallel Execution](#basic-parallel-execution)
- [Advanced Orchestration](#advanced-orchestration)
- [Patterns and Strategies](#patterns-and-strategies)
- [Real-World Examples](#real-world-examples)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Overview

Parallel subagents in Axiom MCP allow you to spawn multiple Claude instances that work simultaneously on different tasks. This transforms hours of sequential work into minutes of parallel execution.

### Why Parallel Subagents?

Traditional approach:
```
Task 1 (10 min) → Task 2 (10 min) → Task 3 (10 min) = 30 minutes
```

Axiom parallel approach:
```
Task 1 (10 min) ┐
Task 2 (10 min) ├→ All complete in 10 minutes
Task 3 (10 min) ┘
```

## Core Concepts

### 1. Spawn Patterns

Axiom supports three spawn patterns:

#### Single Execution (Default)
```javascript
axiom_spawn({
  prompt: "Create user.js with CRUD operations",
  verboseMasterMode: true
});
```

#### Parallel Execution
```javascript
axiom_spawn({
  prompt: "Create authentication system",
  spawnPattern: "parallel",
  spawnCount: 3,
  verboseMasterMode: true
});
```

#### Decompose Pattern
```javascript
axiom_spawn({
  prompt: "Build e-commerce platform",
  spawnPattern: "decompose",
  spawnCount: 5,
  verboseMasterMode: true
});
```

### 2. Task Independence

For optimal parallelism, tasks must be **orthogonal** (independent):

✅ **Good**: Each task creates different files
```javascript
// These can run in parallel without conflicts
Task 1: "Create auth.js with JWT authentication"
Task 2: "Create database.js with PostgreSQL connection"
Task 3: "Create server.js with Express setup"
```

❌ **Bad**: Tasks modify the same files
```javascript
// These will conflict
Task 1: "Add login function to auth.js"
Task 2: "Add logout function to auth.js"
Task 3: "Add refresh token to auth.js"
```

## Basic Parallel Execution

### Simple Parallel Tasks

```javascript
// Launch 3 workers on the same prompt
axiom_spawn({
  prompt: "Implement factorial function",
  spawnPattern: "parallel",
  spawnCount: 3,
  verboseMasterMode: true
});

// Result: 3 different implementations
// - factorial.py (recursive)
// - factorial.js (iterative)
// - Factorial.java (memoized)
```

### Monitoring Parallel Execution

With `verboseMasterMode: true`, you'll see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           VERBOSE MASTER MODE - PARALLEL EXECUTION          
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Parent Task: Implement factorial function
Pattern: parallel | Children: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[task-123] Starting Python implementation...
[task-456] Starting JavaScript implementation...
[task-789] Starting Java implementation...
[task-456] [INTERVENTION] Stop planning! Write code now!
[task-123] Created factorial.py
[task-456] Created factorial.js
[task-789] Created Factorial.java
```

## Advanced Orchestration

### Claude Orchestration Tool

For fine-grained control, use `axiom_claude_orchestrate`:

```javascript
// Spawn named instances
axiom_claude_orchestrate({
  action: "spawn",
  instanceId: "backend-dev"
});

axiom_claude_orchestrate({
  action: "spawn",
  instanceId: "frontend-dev"
});

axiom_claude_orchestrate({
  action: "spawn",
  instanceId: "test-writer"
});

// Send specific prompts to each
axiom_claude_orchestrate({
  action: "prompt",
  instanceId: "backend-dev",
  prompt: "Create REST API with Express.js"
});

axiom_claude_orchestrate({
  action: "prompt",
  instanceId: "frontend-dev",
  prompt: "Create React components for user dashboard"
});

axiom_claude_orchestrate({
  action: "prompt",
  instanceId: "test-writer",
  prompt: "Write Jest tests for API endpoints"
});
```

### Steering Subagents Mid-Execution

```javascript
// Monitor backend output
const output = await axiom_claude_orchestrate({
  action: "get_output",
  instanceId: "backend-dev",
  lines: 50
});

// If it's using the wrong framework, steer it
if (output.includes("Koa")) {
  axiom_claude_orchestrate({
    action: "steer",
    instanceId: "backend-dev",
    prompt: "Actually, use Express.js instead of Koa"
  });
}
```

## Patterns and Strategies

### 1. The Shotgun Pattern

Try multiple approaches simultaneously:

```javascript
const approaches = [
  "REST API with Express and PostgreSQL",
  "GraphQL API with Apollo and MongoDB",
  "tRPC API with Next.js and Prisma"
];

approaches.forEach((approach, index) => {
  axiom_spawn({
    prompt: `Build user management system using ${approach}`,
    verboseMasterMode: true
  });
});

// Pick the best implementation after reviewing all three
```

### 2. The Assembly Line Pattern

Sequential handoffs between specialists:

```javascript
// Stage 1: API Designer
axiom_claude_orchestrate({
  action: "spawn",
  instanceId: "api-designer"
});

axiom_claude_orchestrate({
  action: "prompt",
  instanceId: "api-designer",
  prompt: "Create OpenAPI specification for task management API"
});

// Wait for completion...

// Stage 2: Backend Developer
axiom_claude_orchestrate({
  action: "spawn",
  instanceId: "backend-dev"
});

axiom_claude_orchestrate({
  action: "prompt",
  instanceId: "backend-dev",
  prompt: "Implement the API from openapi.yaml specification"
});

// Stage 3: Frontend Developer (can start once API spec exists)
axiom_claude_orchestrate({
  action: "spawn",
  instanceId: "frontend-dev"
});

axiom_claude_orchestrate({
  action: "prompt",
  instanceId: "frontend-dev",
  prompt: "Generate TypeScript client from openapi.yaml"
});
```

### 3. The Peer Review Pattern

Developer + Reviewer working in tandem:

```javascript
// Spawn developer and reviewer
["developer", "reviewer"].forEach(role => {
  axiom_claude_orchestrate({
    action: "spawn",
    instanceId: role
  });
});

// Developer writes code
axiom_claude_orchestrate({
  action: "prompt",
  instanceId: "developer",
  prompt: "Implement user authentication with JWT"
});

// After 30 seconds, reviewer checks the code
setTimeout(() => {
  axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "reviewer",
    prompt: "Review auth.js for security vulnerabilities"
  });
}, 30000);

// Developer can fix issues in real-time based on feedback
```

### 4. The Competition Pattern

Multiple agents compete to solve the same problem:

```javascript
// Launch competition
axiom_spawn({
  prompt: "Create the fastest sorting algorithm",
  spawnPattern: "parallel",
  spawnCount: 5,
  verboseMasterMode: true
});

// Each agent will try different approaches:
// - Agent 1: QuickSort with optimizations
// - Agent 2: MergeSort with parallel processing
// - Agent 3: HeapSort with cache optimization
// - Agent 4: RadixSort for integers
// - Agent 5: Hybrid approach

// Benchmark and pick the winner
```

## Real-World Examples

### Example 1: Full-Stack Application

```javascript
// Define components
const components = [
  { id: "db", task: "Create PostgreSQL schema for social media app" },
  { id: "api", task: "Build GraphQL API with type-graphql" },
  { id: "auth", task: "Implement OAuth2 with Google and GitHub" },
  { id: "frontend", task: "Create Next.js app with Tailwind" },
  { id: "mobile", task: "Build React Native app" }
];

// Launch all components in parallel
components.forEach(({ id, task }) => {
  axiom_claude_orchestrate({
    action: "spawn",
    instanceId: id
  });
  
  axiom_claude_orchestrate({
    action: "prompt",
    instanceId: id,
    prompt: task
  });
});

// Monitor progress
setInterval(() => {
  components.forEach(({ id }) => {
    axiom_claude_orchestrate({
      action: "status",
      instanceId: id
    });
  });
}, 10000);
```

### Example 2: Microservices Architecture

```javascript
const microservices = [
  "user-service: Node.js service for user management",
  "auth-service: JWT authentication service",
  "payment-service: Stripe integration service",
  "notification-service: Email/SMS notification service",
  "analytics-service: Event tracking service"
];

// Create all microservices simultaneously
microservices.forEach(service => {
  axiom_spawn({
    prompt: `Create ${service} with Docker support`,
    verboseMasterMode: true
  });
});

// Result: 5 complete microservices in ~5 minutes
```

### Example 3: Test Coverage Sprint

```javascript
// Find all files that need tests
const filesToTest = [
  "src/auth.js",
  "src/database.js",
  "src/api/users.js",
  "src/api/products.js",
  "src/utils/validators.js"
];

// Spawn a test writer for each file
filesToTest.forEach((file, index) => {
  axiom_spawn({
    prompt: `Create comprehensive Jest tests for ${file}`,
    verboseMasterMode: true
  });
});

// 5 test files created in parallel
// Total time: ~3 minutes vs 15 minutes sequential
```

## Performance Optimization

### 1. Resource Limits

```javascript
// Set maximum concurrent tasks
process.env.AXIOM_MAX_TASKS = "5";

// Or in MCP config:
{
  "mcpServers": {
    "axiom-mcp": {
      "env": {
        "AXIOM_MAX_TASKS": "5"
      }
    }
  }
}
```

### 2. Task Sizing

Optimal task size for parallel execution:
- **5-10 minutes**: Perfect for parallelism
- **< 2 minutes**: Too small, overhead dominates
- **> 15 minutes**: Too large, risk of drift

### 3. Batching Strategy

```javascript
// Process large lists in batches
const files = ["file1.js", "file2.js", /* ... */ "file100.js"];
const batchSize = 5;

for (let i = 0; i < files.length; i += batchSize) {
  const batch = files.slice(i, i + batchSize);
  
  // Process batch in parallel
  batch.forEach(file => {
    axiom_spawn({
      prompt: `Refactor ${file} to use TypeScript`,
      verboseMasterMode: true
    });
  });
  
  // Wait for batch to complete before next
  await new Promise(resolve => setTimeout(resolve, 180000)); // 3 min
}
```

### 4. Memory Management

For memory-intensive tasks:

```javascript
// Disable verbose mode for large operations
axiom_spawn({
  prompt: "Process 1000 CSV files",
  spawnPattern: "parallel",
  spawnCount: 3,
  verboseMasterMode: false  // Reduce memory overhead
});
```

## Troubleshooting

### Common Issues

#### 1. File Conflicts
**Problem**: Multiple agents trying to modify the same file
**Solution**: Design orthogonal tasks that create different files

```javascript
// ❌ Bad: All modify server.js
["add routes", "add middleware", "add error handling"]

// ✅ Good: Each creates different files
["create routes/users.js", "create middleware/auth.js", "create errors/handlers.js"]
```

#### 2. Resource Exhaustion
**Problem**: Too many parallel tasks overwhelming the system
**Solution**: Limit concurrent tasks and use batching

```javascript
// Check current tasks before spawning more
const status = await axiom_status({});
const runningTasks = status.tasks.filter(t => t.status === "running").length;

if (runningTasks < 5) {
  axiom_spawn({ /* ... */ });
}
```

#### 3. Dependency Issues
**Problem**: Task B needs output from Task A
**Solution**: Use orchestration for sequential dependencies

```javascript
// Wait for schema creation
const schemaStatus = await axiom_claude_orchestrate({
  action: "status",
  instanceId: "db-designer"
});

if (schemaStatus === "complete") {
  // Now safe to generate models
  axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "model-generator",
    prompt: "Generate Prisma models from schema.sql"
  });
}
```

### Debug Commands

```javascript
// View all running tasks
axiom_status({});

// Check specific instance
axiom_claude_orchestrate({
  action: "status",
  instanceId: "backend-dev"
});

// Get last 100 lines of output
axiom_claude_orchestrate({
  action: "get_output",
  instanceId: "backend-dev",
  lines: 100
});

// Kill a stuck task
axiom_interrupt({ taskId: "task-123" });
```

## Best Practices

1. **Design for Independence**: Tasks should not depend on each other's output
2. **Use Meaningful IDs**: Name instances based on their role
3. **Monitor Progress**: Check status regularly with verbose mode
4. **Handle Failures**: Some agents may fail - have contingencies
5. **Verify Output**: Always check that files were actually created

## Conclusion

Parallel subagents transform Axiom from a single-task executor into a powerful orchestration system. By running multiple Claude instances simultaneously, you can:

- Build complete applications in hours instead of days
- Explore multiple solutions simultaneously
- Maintain high productivity with peer review
- Scale development across entire codebases

Remember: The goal is always **files created**, and parallel execution multiplies your file creation rate.