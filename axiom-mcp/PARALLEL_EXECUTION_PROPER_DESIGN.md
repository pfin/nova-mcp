# Proper Parallel Execution Design

## The Real Problem

We need parallel Claude instances to:
1. Work without file conflicts
2. Preserve their work
3. Allow comparison of results
4. Enable synthesis of best solutions

## Two Valid Approaches

### Approach 1: Temporary Directories (Simpler)

```typescript
class ParallelClaudeExecutor {
  async spawn(instanceId: string) {
    // Create temp directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `axiom-${instanceId}-`));
    
    // Copy project files
    await fs.cp(process.cwd(), tempDir, { recursive: true });
    
    // Spawn Claude in temp directory
    const claude = spawn('claude', [], { cwd: tempDir });
    
    // Track instance
    this.instances.set(instanceId, {
      claude,
      tempDir,
      outputs: []
    });
  }
  
  async collectResults() {
    const results = new Map();
    
    for (const [id, instance] of this.instances) {
      // Collect all created/modified files
      const files = await this.findModifiedFiles(instance.tempDir);
      
      // Read file contents
      const fileContents = new Map();
      for (const file of files) {
        const content = await fs.readFile(path.join(instance.tempDir, file), 'utf-8');
        fileContents.set(file, content);
      }
      
      results.set(id, {
        outputs: instance.outputs.join(''),
        files: fileContents
      });
    }
    
    return results;
  }
  
  async synthesize(results: Map) {
    // Compare different implementations
    // Pick best parts from each
    // Create unified solution
  }
}
```

### Approach 2: Git Worktrees Done Right

```typescript
class ProperWorktreeExecutor {
  async spawn(instanceId: string) {
    const branchName = `parallel/${instanceId}`;
    const worktreePath = `../work-${instanceId}`;
    
    // Create worktree
    await git.worktree.add(worktreePath, { 
      branch: branchName,
      base: 'main' 
    });
    
    // Spawn Claude
    const claude = spawn('claude', [], { cwd: worktreePath });
    
    // Monitor for completion
    claude.on('exit', () => this.handleCompletion(instanceId));
  }
  
  async handleCompletion(instanceId: string) {
    const instance = this.instances.get(instanceId);
    const git = simpleGit(instance.worktreePath);
    
    // Check if any files were created
    const status = await git.status();
    
    if (status.files.length > 0) {
      // Commit the work
      await git.add('.');
      await git.commit(`Parallel task ${instanceId} completed`);
      
      // Mark branch for review
      await git.addTag(`review-${instanceId}`);
    }
    
    // Keep worktree for manual review
    // Do NOT auto-remove
  }
  
  async reviewAndMerge() {
    // List all parallel branches
    const branches = await git.branch({ pattern: 'parallel/*' });
    
    // Manual or automated review process
    for (const branch of branches) {
      console.log(`Review branch: ${branch}`);
      // Show diff
      // Score quality
      // Decide to merge or discard
    }
  }
}
```

## Key Insights

### What Went Wrong
1. **Auto-cleanup destroys work** - Never use `--force` remove
2. **No success tracking** - Must detect task completion
3. **No commit step** - Work stays uncommitted
4. **No merge strategy** - Branches are orphaned

### What Must Happen
1. **Preserve all work** - Commit before any cleanup
2. **Track success/failure** - Know which branches have value
3. **Enable review** - Human or automated quality check
4. **Selective merge** - Only merge good solutions

## Recommended Implementation

For Axiom MCP v4, use **temporary directories**:
- Simpler to implement
- No git complexity
- Easy to compare outputs
- Can still prevent conflicts

Save git worktrees for v5 when we have:
- Success detection
- Automated commits  
- Merge strategies
- Quality scoring

## The MCTS Connection

MCTS needs to:
1. **Try multiple paths** - ✓ We can do this
2. **Evaluate paths** - Need scoring function
3. **Select best paths** - Need comparison logic
4. **Merge learnings** - Need synthesis, not git merge

Git branches are the wrong abstraction. We need:
- Parallel execution (temp dirs work)
- Output comparison (in memory)
- Solution synthesis (LLM-based)
- Learning propagation (not git merge)