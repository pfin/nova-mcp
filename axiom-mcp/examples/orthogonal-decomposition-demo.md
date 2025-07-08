# Orthogonal Decomposition Demo

This demonstrates how to use Axiom MCP's orthogonal decomposition feature to execute complex tasks in parallel without conflicts.

## Basic Decomposition

First, let's see how a task gets decomposed into orthogonal chunks:

```typescript
// Decompose a complex task into orthogonal parts
await axiom_orthogonal_decompose({
  action: "decompose",
  prompt: "Build a REST API with authentication"
});

// Expected output:
{
  "tasks": [
    {
      "id": "models",
      "prompt": "Create data models in models/ directory. Focus on schema only, no dependencies.",
      "duration": 5,
      "outputs": ["models/index.js"]
    },
    {
      "id": "routes",
      "prompt": "Create route handlers in routes/ directory. Use mock data, no database.",
      "duration": 5,
      "outputs": ["routes/index.js"]
    },
    {
      "id": "middleware",
      "prompt": "Create middleware in middleware/ directory. Auth and error handling.",
      "duration": 5,
      "outputs": ["middleware/auth.js", "middleware/error.js"]
    },
    {
      "id": "tests",
      "prompt": "Create tests in tests/ directory. Unit tests only, mock everything.",
      "duration": 5,
      "outputs": ["tests/api.test.js"]
    },
    {
      "id": "config",
      "prompt": "Create configuration in config/index.js. Environment variables.",
      "duration": 5,
      "outputs": ["config/index.js"]
    },
    {
      "id": "integration",
      "prompt": "Integrate all components. Connect and test together.",
      "duration": 5,
      "outputs": ["app.js"],
      "dependencies": ["models", "routes", "middleware", "tests", "config"],
      "trigger": "after-orthogonal"
    }
  ]
}
```

## Execute Decomposition

Execute all tasks in parallel:

```typescript
// Execute the decomposed tasks
await axiom_orthogonal_decompose({
  action: "execute",
  prompt: "Build a REST API with authentication"
});

// Expected output:
{
  "totalTasks": 6,
  "completed": 5,
  "failed": 0,
  "tasks": [
    {
      "id": "models",
      "status": "complete",
      "outputs": ["models/index.js"],
      "duration": 4523
    },
    {
      "id": "routes",
      "status": "complete",
      "outputs": ["routes/index.js"],
      "duration": 4789
    },
    // ... more tasks
  ]
}
```

## Monitor Progress

Check status while tasks are running:

```typescript
// Check status of running tasks
await axiom_orthogonal_decompose({
  action: "status"
});

// Expected output:
{
  "tasks": [
    {
      "id": "models",
      "status": "running",
      "duration": 2341,
      "outputSize": 1523
    },
    {
      "id": "routes",
      "status": "complete",
      "duration": 4789,
      "outputSize": 3421
    },
    // ... more tasks
  ]
}
```

## Merge Results

After execution, merge the results using MCTS scoring:

```typescript
// Merge completed executions
await axiom_orthogonal_decompose({
  action: "merge"
});

// Expected output:
{
  "mergedFiles": [
    "models/index.js",
    "routes/index.js",
    "middleware/auth.js",
    "middleware/error.js",
    "tests/api.test.js",
    "config/index.js",
    "app.js"
  ],
  "totalSize": 15234
}
```

## Complete Workflow Example

Here's a complete workflow for building an LRU cache:

```typescript
// 1. Decompose the task
await axiom_orthogonal_decompose({
  action: "decompose",
  prompt: "Build an LRU cache with TTL support"
});

// 2. Execute in parallel
await axiom_orthogonal_decompose({
  action: "execute",
  prompt: "Build an LRU cache with TTL support"
});

// 3. Check status
await axiom_orthogonal_decompose({
  action: "status"
});

// 4. Merge results
await axiom_orthogonal_decompose({
  action: "merge"
});
```

## Integration with Git Worktrees

For even better isolation, combine with `axiom_claude_orchestrate_proper`:

```typescript
// First decompose
const decomposition = await axiom_orthogonal_decompose({
  action: "decompose",
  prompt: "Build a blog platform with comments"
});

// Then execute each task in a separate worktree
for (const task of decomposition.tasks) {
  // Spawn Claude in isolated worktree
  await axiom_claude_orchestrate_proper({
    action: "spawn",
    instanceId: task.id,
    useWorktree: true,
    autoMerge: true
  });
  
  // Send the task prompt
  await axiom_claude_orchestrate_proper({
    action: "prompt",
    instanceId: task.id,
    prompt: task.prompt
  });
}

// Monitor all instances
await axiom_claude_orchestrate_proper({
  action: "status",
  instanceId: "all"
});

// Auto-merge will handle integration
```

## Key Benefits

1. **No File Conflicts** - Each task creates different files
2. **True Parallelism** - All tasks run simultaneously
3. **5-Minute Time Bounds** - Prevents drift and enables interruption
4. **Automatic Integration** - Reserve tasks handle integration
5. **MCTS Scoring** - Best implementations selected automatically

## Orthogonal Task Patterns

Good orthogonal decomposition:
- Models → Routes → Tests → Config → Integration
- Core → Utils → Tests → Docs → Examples
- Frontend → Backend → Database → Tests → Deploy

Bad decomposition (conflicts):
- Multiple tasks editing same file
- Overlapping responsibilities
- Sequential dependencies