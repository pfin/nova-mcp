# Critical Analysis: Git Worktree Implementation Issues

## The Fatal Flaw

The current implementation creates isolated git worktrees but **has no way to merge results back**. This defeats the entire purpose of parallel execution.

## What Happens Now

1. **Spawn**: Creates worktree + branch ✓
2. **Execute**: Claude works in isolation ✓  
3. **Complete**: Claude exits...
4. **Cleanup**: `git worktree remove --force` destroys all work ✗
5. **Result**: Work is lost, branch is orphaned

## The Core Problem

We've built **parallel universes** with **no way to bring them back together**.

### Current Code (BAD):
```typescript
// Creates isolated branch
await this.git.raw(['worktree', 'add', '-b', branchName, worktreePath, baseBranch]);

// Later... destroys everything
await this.git.raw(['worktree', 'remove', '--force', worktree.path]);
```

### What Actually Should Happen:

```typescript
// 1. Claude completes task
// 2. Commit the work
await git.add('.');
await git.commit(`Task ${instanceId}: ${summary}`);

// 3. Switch back to main
await git.checkout('main');

// 4. Merge successful work
await git.merge(branchName);

// 5. THEN remove worktree
await git.raw(['worktree', 'remove', worktreePath]);
```

## Why This Matters for MCTS

MCTS requires:
1. **Exploration** - Multiple paths tried (we have this)
2. **Evaluation** - Score each path (missing)
3. **Selection** - Choose best paths (missing)
4. **Backpropagation** - Merge results back (completely missing!)

## The Real Solution

We need two approaches:

### Option 1: Worktrees for File Isolation Only
- Use worktrees just to prevent file conflicts
- Each Claude commits its work
- Manual merge process after
- Suitable for: Human-in-the-loop workflows

### Option 2: Full Automated Synthesis
- Don't use git branches at all
- Each Claude works in temp directory
- Collect outputs in memory
- Synthesize results programmatically
- Suitable for: Full automation

## Current State Assessment

The worktree implementation is **worse than useless** - it actively destroys work. The old v1 merge tool had the right idea: work with outputs, not git branches.

## Recommendation

Either:
1. Fix the worktree implementation to actually preserve and merge work
2. Abandon worktrees and use temporary directories with output collection
3. Admit this is a semi-manual process requiring human git operations

The current implementation gives the **illusion** of parallel execution while **destroying** all parallel work.