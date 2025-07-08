# LLM Guide: Parallel Execution with Git Worktrees

## What You Need to Know

As an LLM using Axiom MCP tools, you need to understand git worktrees to effectively run parallel tasks. This guide explains everything from first principles.

## Core Concept: The Conflict Problem

When you use `axiom_spawn` multiple times in the same directory:
- Task 1 writes to `src/index.js`
- Task 2 also writes to `src/index.js` 
- **Result**: Lost work, corrupted files, chaos

## Solution: Git Worktrees

Think of worktrees as **parallel universes** for your code:
- Each task gets its own complete directory
- All share the same git history
- Changes don't conflict
- You can merge the best results

## How to Use as an LLM

### Step 1: Check Available Tools

```json
// First, check if worktree support is available
tools/list
// Look for: axiom_claude_orchestrate or axiom_claude_orchestrate_worktree
```

### Step 2: Spawn with Isolation

```json
// OLD WAY (causes conflicts):
axiom_spawn({
  "prompt": "implement user authentication"
})

// NEW WAY (with worktrees):
axiom_claude_orchestrate({
  "action": "spawn",
  "instanceId": "auth-solver",
  "useWorktree": true,
  "baseBranch": "main"
})
```

### Step 3: Understanding What Happens

When you spawn with worktrees:
1. Creates directory `../axiom-auth-solver/`
2. Makes branch `axiom/auth-solver/1234567`
3. Claude runs in that isolated directory
4. All changes tracked separately

### Step 4: Check Progress

```json
axiom_claude_orchestrate({
  "action": "status",
  "instanceId": "*"  // See all instances
})

// Returns something like:
{
  "instances": [
    {
      "id": "auth-solver",
      "worktreePath": "../axiom-auth-solver",
      "branch": "axiom/auth-solver/1234567",
      "state": "working"
    }
  ]
}
```

## Complete Example: Parallel Problem Solving

```json
// 1. Spawn three different approaches
axiom_claude_orchestrate({
  "action": "spawn",
  "instanceId": "approach-functional",
  "useWorktree": true
})

axiom_claude_orchestrate({
  "action": "spawn", 
  "instanceId": "approach-oop",
  "useWorktree": true
})

axiom_claude_orchestrate({
  "action": "spawn",
  "instanceId": "approach-hybrid",
  "useWorktree": true
})

// 2. Give each a different strategy
axiom_claude_orchestrate({
  "action": "prompt",
  "instanceId": "approach-functional",
  "prompt": "Implement the task using pure functional programming"
})

axiom_claude_orchestrate({
  "action": "prompt",
  "instanceId": "approach-oop", 
  "prompt": "Implement the task using object-oriented design patterns"
})

axiom_claude_orchestrate({
  "action": "prompt",
  "instanceId": "approach-hybrid",
  "prompt": "Implement the task using a hybrid approach"
})

// 3. Monitor all three
axiom_claude_orchestrate({
  "action": "status",
  "instanceId": "*"
})

// 4. Steer if one gets stuck
axiom_claude_orchestrate({
  "action": "steer",
  "instanceId": "approach-functional",
  "prompt": "Focus on the authentication module first"
})

// 5. Get output from the best one
axiom_claude_orchestrate({
  "action": "get_output",
  "instanceId": "approach-oop",
  "lines": 100
})
```

## Key Concepts for LLMs

### Instance IDs
- Choose descriptive names: `parser-v1`, `test-runner`, `api-builder`
- Each ID maps to one worktree/directory
- Reusing an ID will fail (instance already exists)

### Branches
- Automatically created: `axiom/{instanceId}/{timestamp}`
- Each instance works on its own branch
- No manual branch management needed

### Directories
- Main repo: Where you started
- Worktrees: `../axiom-{instanceId}/`
- Each is a complete copy of the working files

### State Management
- `starting`: Setting up
- `ready`: Waiting for prompt
- `working`: Executing task
- `complete`: Finished

## What This Enables

### 1. True Parallel Exploration
```
Without worktrees: Task1 → Task2 → Task3 (sequential)
With worktrees:    Task1 ↓
                   Task2 ↓  (all at once)
                   Task3 ↓
```

### 2. Safe Experimentation
- Try risky approaches without breaking main code
- Failed attempts are isolated
- Easy to discard bad solutions

### 3. MCTS-Style Search
- Multiple paths explored simultaneously
- Compare results objectively
- Merge only the best solutions

## Common Patterns

### Pattern 1: Multiple Solvers
```json
// Spawn 5 solvers for complex problem
for (let i = 1; i <= 5; i++) {
  axiom_claude_orchestrate({
    "action": "spawn",
    "instanceId": `solver-${i}`,
    "useWorktree": true
  })
}
```

### Pattern 2: Test Different Approaches
```json
// One for implementation, one for tests
axiom_claude_orchestrate({
  "action": "spawn",
  "instanceId": "impl",
  "useWorktree": true
})

axiom_claude_orchestrate({
  "action": "spawn",
  "instanceId": "tests",
  "useWorktree": true
})
```

### Pattern 3: Steer and Converge
```json
// Monitor all instances
const status = axiom_claude_orchestrate({
  "action": "status",
  "instanceId": "*"
})

// Steer the promising ones
// Kill the stuck ones
// Merge the successful ones
```

## Troubleshooting

### "Instance already exists"
- You tried to spawn with same ID twice
- Solution: Use unique IDs or cleanup first

### "Maximum instances reached"
- Default limit is 10 concurrent instances
- Solution: Clean up completed instances

### "Worktree creation failed"
- Might be file system permissions
- Solution: Tool will fall back to main directory

## Important Notes

1. **Always use unique instanceIds** - No reuse without cleanup
2. **Cleanup when done** - Prevents resource exhaustion
3. **Check status regularly** - Know what's happening
4. **Worktrees are isolated** - Changes don't affect each other
5. **Main branch stays clean** - All work on feature branches

## The Power of Parallel Execution

With worktrees, you can:
- Run 10 different solutions simultaneously
- Compare approaches objectively
- Never lose work to conflicts
- Build faster through parallelism
- Implement true MCTS-style exploration

This transforms Axiom from a sequential tool to a parallel exploration engine.