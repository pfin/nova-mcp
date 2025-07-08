# Complete Parallel Execution Guide for Axiom MCP v4

## Overview

Axiom MCP v4 provides three complementary tools for parallel Claude execution:

1. **`axiom_spawn`** - Basic parallel execution with hooks and monitoring
2. **`axiom_claude_orchestrate_proper`** - Git worktree isolation with auto-commit/merge
3. **`axiom_orthogonal_decompose`** - 5-minute task decomposition for conflict-free parallelism

## The Complete Solution

### Step 1: Decompose Complex Tasks

```typescript
// Break down a complex task into orthogonal chunks
const result = await axiom_orthogonal_decompose({
  action: "decompose",
  prompt: "Build a complete e-commerce platform with user management, product catalog, and checkout"
});

// Returns orthogonal tasks that won't conflict:
// - models/user.js
// - models/product.js
// - routes/auth.js
// - routes/products.js
// - routes/checkout.js
// - tests/*.test.js
```

### Step 2: Execute in Parallel with Git Isolation

```typescript
// Option A: Let decomposer handle execution
await axiom_orthogonal_decompose({
  action: "execute",
  prompt: "Build a complete e-commerce platform..."
});

// Option B: Manual control with git worktrees
for (const task of tasks) {
  await axiom_claude_orchestrate_proper({
    action: "spawn",
    instanceId: task.id,
    useWorktree: true,
    autoMerge: true
  });
  
  await axiom_claude_orchestrate_proper({
    action: "prompt",
    instanceId: task.id,
    prompt: task.prompt
  });
}
```

### Step 3: Monitor Progress

```typescript
// Check decomposer status
await axiom_orthogonal_decompose({
  action: "status"
});

// Check individual Claude instances
await axiom_claude_orchestrate_proper({
  action: "status",
  instanceId: "all"
});

// Use axiom_spawn for detailed monitoring
await axiom_status();
```

### Step 4: Automatic Integration

```typescript
// Merge results (MCTS scoring selects best implementations)
await axiom_orthogonal_decompose({
  action: "merge"
});

// Or trigger manual merge
await axiom_claude_orchestrate_proper({
  action: "merge_all"
});
```

## Key Concepts

### 1. Orthogonal Decomposition
Tasks are "orthogonal" when they:
- Create different files (no conflicts)
- Have no shared dependencies
- Can execute in any order
- Complete within 5 minutes

### 2. Git Worktree Isolation
Each parallel task:
- Gets its own git worktree
- Works in isolated directory
- Auto-commits on completion
- Auto-merges if no conflicts

### 3. MCTS Conflict Resolution
When automatic merge fails:
- Multiple solutions evaluated
- Quality scores assigned
- Best parts synthesized
- Optimal solution created

## Complete Example: Building a REST API

```typescript
// 1. Decompose into orthogonal tasks
await axiom_orthogonal_decompose({
  action: "decompose",
  prompt: "Build a REST API for a task management system with authentication"
});

// Output:
// - Task 1: Create models (models/user.js, models/task.js)
// - Task 2: Create auth routes (routes/auth.js)
// - Task 3: Create task routes (routes/tasks.js)
// - Task 4: Create middleware (middleware/auth.js)
// - Task 5: Create tests (tests/*.test.js)
// - Task 6: Integration (app.js) - runs after others

// 2. Execute all tasks in parallel
await axiom_orthogonal_decompose({
  action: "execute",
  prompt: "Build a REST API for a task management system with authentication"
});

// 3. Monitor progress
const status = await axiom_orthogonal_decompose({
  action: "status"
});
console.log(`Running: ${status.tasks.filter(t => t.status === 'running').length}`);
console.log(`Complete: ${status.tasks.filter(t => t.status === 'complete').length}`);

// 4. Merge results
await axiom_orthogonal_decompose({
  action: "merge"
});

// Result: Complete API with all components integrated!
```

## Advanced Patterns

### Pattern 1: Hybrid Decomposition
```typescript
// Use MCTS for complex interdependencies
await axiom_orthogonal_decompose({
  action: "execute",
  prompt: "Refactor legacy codebase to microservices",
  strategy: "hybrid"  // Combines orthogonal + MCTS
});
```

### Pattern 2: Reserve Tasks
```typescript
// Reserve tasks activate on failure
{
  id: "integration",
  prompt: "Connect all components",
  dependencies: ["models", "routes", "tests"],
  trigger: "after-orthogonal"  // Runs after main tasks
}
```

### Pattern 3: Parallel Testing
```typescript
// Run same task multiple times for A/B testing
await axiom_spawn({
  prompt: "Implement caching layer",
  spawnPattern: "parallel",
  spawnCount: 3,
  verboseMasterMode: true
});
// Then use MCTS to select best implementation
```

## Troubleshooting

### Issue: File conflicts
**Solution**: Ensure tasks are truly orthogonal (different files)

### Issue: Tasks timing out
**Solution**: Break into smaller chunks (< 5 minutes each)

### Issue: Merge conflicts
**Solution**: Let MCTS handle it, or adjust task boundaries

### Issue: Lost work
**Solution**: Use `axiom_claude_orchestrate_proper` with auto-commit

## Performance Tips

1. **Optimal task size**: 3-5 minutes
2. **Max parallel tasks**: 10 (system dependent)
3. **Use worktrees**: For complete isolation
4. **Monitor actively**: Interrupt bad paths early

## Integration with CI/CD

```bash
# In your CI pipeline
npm install -g @nova-mcp/axiom-mcp

# Decompose and execute
axiom_orthogonal_decompose execute "Add test coverage to all modules"

# Check results
axiom_orthogonal_decompose status

# Merge if successful
axiom_orthogonal_decompose merge
```

## Summary

The complete parallel execution solution:
1. **Decompose** tasks into 5-minute orthogonal chunks
2. **Execute** in parallel with git isolation
3. **Monitor** progress and interrupt if needed
4. **Merge** automatically or with MCTS

This enables 10x faster development with zero lost work and automatic integration.