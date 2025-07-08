# Parallel Execution with Git Worktrees Guide

## Overview

When running multiple Claude instances or parallel Axiom tasks, file conflicts are inevitable without proper isolation. Git worktrees provide the perfect solution - allowing each execution to work in its own isolated directory while sharing the same repository.

## The Problem

Without worktrees, parallel executions face:
- **File conflicts** when multiple processes write simultaneously
- **Git corruption** from concurrent git operations
- **Lost work** when instances overwrite each other's changes
- **Unclear history** of which instance made which changes
- **Merge conflicts** that are impossible to resolve

## The Solution: Git Worktrees

Git worktrees enable:
- **Complete isolation** - Each instance has its own working directory
- **Shared repository** - All instances use the same git database
- **Independent branches** - Each can work on different branches
- **Safe parallelism** - No conflicts between instances
- **Clear tracking** - Know exactly what each instance did

## How to Use Worktrees with Axiom

### 1. Basic Worktree Commands

```bash
# List all worktrees
git worktree list

# Add a new worktree
git worktree add ../task-123 -b feature/task-123

# Remove a worktree
git worktree remove ../task-123

# Clean up stale worktree info
git worktree prune
```

### 2. Axiom Integration

The new `axiom_claude_orchestrate_worktree` tool automatically handles worktrees:

```json
{
  "action": "spawn",
  "instanceId": "claude1",
  "useWorktree": true,      // Enable worktree isolation
  "baseBranch": "main"      // Branch to create worktree from
}
```

### 3. Directory Structure

```
nova-mcp/                    # Main repository
├── axiom-mcp/              # Main working directory
│   ├── src/
│   └── ...
├── axiom-claude1/          # Worktree for instance 1
│   ├── src/               # Complete copy of working files
│   └── .git               # File pointing to main repo
├── axiom-claude2/          # Worktree for instance 2
│   ├── src/
│   └── .git
└── axiom-task-abc/         # Worktree for specific task
    ├── src/
    └── .git
```

### 4. Workflow Example

```javascript
// 1. Spawn Claude with isolated worktree
await axiom_claude_orchestrate_worktree({
  action: "spawn",
  instanceId: "solver1",
  useWorktree: true,
  baseBranch: "main"
});

// 2. Claude works in isolated directory
// Creates files, makes changes, runs tests
// All without affecting other instances

// 3. Check status - includes worktree info
const status = await axiom_claude_orchestrate_worktree({
  action: "status",
  instanceId: "solver1"
});
// Returns: { worktreePath: "../axiom-solver1", branch: "axiom/solver1/1234567" }

// 4. Cleanup removes worktree automatically
await axiom_claude_orchestrate_worktree({
  action: "cleanup",
  instanceId: "solver1"
});
```

## Best Practices

### 1. Naming Conventions
- Use clear instance IDs: `solver1`, `test-runner`, `api-builder`
- Branches auto-named: `axiom/{instanceId}/{timestamp}`
- Worktree dirs: `../axiom-{instanceId}`

### 2. Resource Management
- Limit concurrent worktrees (10 max by default)
- Clean up completed instances promptly
- Run `git worktree prune` periodically

### 3. Merging Results
```bash
# After successful execution, merge the work
git checkout main
git merge axiom/solver1/1234567

# Or cherry-pick specific commits
git cherry-pick abc123
```

### 4. Handling Failures
```bash
# Force remove a stuck worktree
git worktree remove --force ../axiom-solver1

# Clean up all Axiom worktrees
for wt in $(git worktree list --porcelain | grep "axiom-" | cut -d' ' -f2); do
  git worktree remove --force "$wt"
done
```

## Integration with MCTS

Worktrees enable true MCTS-style exploration:

1. **Tree Expansion** - Each worktree is a node
2. **Simulation** - Claude executes in isolation
3. **Evaluation** - Check results without interference
4. **Selection** - Merge successful branches
5. **Backpropagation** - Learn from all attempts

## Troubleshooting

### "Worktree already exists"
```bash
git worktree remove --force ../axiom-instanceId
```

### "Branch already checked out"
Each branch can only be in one worktree. Use unique branch names.

### "Cannot remove worktree with uncommitted changes"
Use `--force` flag or commit/stash changes first.

### View worktree details
```bash
git worktree list --porcelain
```

## Security Considerations

- Each worktree has full repo access
- Credentials/secrets are shared
- Consider using separate configs per worktree if needed
- Clean up sensitive data before removing worktrees

## Performance Notes

- Worktrees share git objects (space efficient)
- Initial creation is fast (no full clone)
- File operations are independent (no lock contention)
- Can have 100s of worktrees without issue

## Conclusion

Git worktrees transform Axiom from "hope they don't conflict" to "guaranteed safe parallel execution". This is essential infrastructure for realizing the vision of multiple Claude instances exploring solution space simultaneously.