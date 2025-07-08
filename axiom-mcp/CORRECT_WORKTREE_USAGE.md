# Correct Git Worktree Usage for Parallel Execution

## The Problem with Current Implementation

```typescript
// CURRENT (BAD):
async cleanup(instanceId: string) {
  // Claude creates files...
  // We immediately destroy everything:
  await this.git.raw(['worktree', 'remove', '--force', worktree.path]);
  // All work is lost!
}
```

## Correct Implementation

```typescript
async handleClaudeCompletion(instanceId: string) {
  const instance = this.instances.get(instanceId);
  const git = simpleGit(instance.worktreePath);
  
  // 1. Check what was created
  const status = await git.status();
  
  if (status.files.length > 0) {
    // 2. Commit the work
    await git.add('.');
    await git.commit(`Claude instance ${instanceId}: Task completed`);
    
    // 3. Push to remote (optional)
    await git.push('origin', instance.branch);
  }
  
  // 4. Switch back to main repo
  const mainGit = simpleGit(this.mainRepo);
  await mainGit.checkout('main');
  
  // 5. NOW we can safely remove worktree
  await mainGit.raw(['worktree', 'remove', instance.worktreePath]);
  
  // 6. Decide whether to merge
  if (await this.evaluateSuccess(instance)) {
    await mainGit.merge(instance.branch);
  }
}
```

## Manual Demonstration

```bash
# 1. Create worktree
git worktree add ../claude-task1 -b task1

# 2. Claude works in worktree
cd ../claude-task1
echo "solution" > solution.js

# 3. MUST commit before removing
git add .
git commit -m "Task 1 solution"

# 4. Go back to main
cd ../main-repo

# 5. NOW safe to remove
git worktree remove ../claude-task1

# 6. Branch still has the work
git log task1  # Shows the commit

# 7. Can merge if good
git merge task1
```

## Why Current Code Fails

1. **No commit step** - Files created but never committed
2. **Force remove** - Deletes uncommitted work
3. **No merge strategy** - Branches orphaned
4. **No success detection** - Don't know what to merge

## The Real Issue

Git worktrees are designed for **human workflows** where you:
- Work in worktree
- Manually commit
- Manually merge
- Then remove worktree

Our code tries to use them for **automated parallel execution** but skips the critical commit/merge steps.

## Solutions

### Option 1: Fix Worktree Usage
Add proper commit/merge logic as shown above.

### Option 2: Use Temp Directories Instead
```typescript
// Simpler approach - no git complexity
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-'));
// Claude works here
// Collect output files
// No git operations needed
```

### Option 3: Admit It's Semi-Manual
Document that users must manually:
```bash
git checkout task1
git log  # Review work
git checkout main
git merge task1  # If good
```

## Conclusion

The current implementation is fundamentally broken because it treats worktrees as temporary directories instead of git branches that need commits and merges.