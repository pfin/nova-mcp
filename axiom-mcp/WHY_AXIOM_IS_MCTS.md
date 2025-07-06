# Why Axiom MCP IS Monte Carlo Tree Search (MCTS)

## The Fundamental Realization

Axiom MCP isn't just *similar* to MCTS - it literally **IS** an implementation of Monte Carlo Tree Search applied to code generation. Here's the evidence:

## 1. Tree Structure = Task Hierarchy

```typescript
// From status-manager.ts
export interface TaskStatus {
  id: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  depth: number;
  parentTask?: string;
  childTasks: string[];
  // ... This IS an MCTS node!
}
```

Every spawned task is a node in a search tree:
- **Root node**: The initial task ("Create unit tests")
- **Child nodes**: Spawned subtasks (different approaches)
- **Depth tracking**: Limits tree expansion (like MCTS depth limits)

## 2. Four Phases of MCTS in Axiom MCP

### Selection Phase
```typescript
// From axiom-mcp-spawn.ts
switch (input.spawnPattern) {
  case 'decompose':    // Exploit known decomposition
  case 'parallel':     // Explore multiple paths
  case 'sequential':   // Depth-first exploitation
  case 'recursive':    // Balanced exploration
}
```

This is literally selecting which part of the tree to explore next!

### Expansion Phase
```typescript
// From axiom-mcp-spawn.ts
for (let i = 0; i < subtasks.length; i++) {
  const childTask: TaskStatus = {
    id: childId,
    prompt: subtask,
    depth: rootTask.depth + 1,
    parentTask: rootTaskId,
    childTasks: [],
  };
  statusManager.addTask(childTask);
}
```

Creating new nodes (tasks) in the tree = MCTS expansion!

### Simulation Phase
```typescript
// From axiom-mcp-spawn.ts
childPromises.push(
  claudeCode.execute(subtask, {
    timeout: 120000,
    systemPrompt: rootTask.systemPrompt,
  })
);
```

Running Claude Code = Monte Carlo simulation/rollout!

### Backpropagation Phase
```typescript
// From axiom-mcp-evaluate.ts
export async function handleAxiomMcpEvaluate(
  input: AxiomMcpEvaluateInput,
  statusManager: StatusManager,
  contextManager: ContextManager,
  claudeCode: ClaudeCodeSubprocess
): Promise<{ content: Array<{ type: string; text: string }> }> {
  // ... evaluate quality ...
  
  if (qualityScore < threshold) {
    // Retry with feedback (negative reward)
    statusManager.updateTask(taskId, {
      status: 'failed',
      evaluationScore: qualityScore,
    });
  } else {
    // Success (positive reward)
    statusManager.updateTask(taskId, {
      status: 'completed',
      evaluationScore: qualityScore,
    });
  }
}
```

Quality scores propagate up to influence future selections!

## 3. Why This Happened Naturally

MCTS emerged in Axiom MCP because:

### A. The Problem Space Demands It
- **Huge search space**: Infinite ways to implement any feature
- **Expensive evaluation**: Running code takes time
- **Quality varies**: Some implementations are better
- **Local patterns**: Similar tasks have similar solutions

### B. The Architecture Enables It
- **Tree spawning**: Natural tree structure
- **Parallel execution**: Multiple simulations
- **Quality evaluation**: Reward signal
- **Retry mechanism**: Learn from failures

### C. Evolution Toward MCTS
1. **Started**: Simple task decomposition
2. **Added**: Quality evaluation (rewards)
3. **Added**: Retry on failure (learning)
4. **Added**: Parallel exploration (breadth)
5. **Result**: Accidentally built MCTS!

## 4. Mathematical Proof

Let's map Axiom MCP to MCTS formally:

### State Space
```
S = {all possible code implementations}
```

### Action Space
```
A(s) = {all possible subtask decompositions from state s}
```

### Reward Function
```typescript
R(s) = evaluationScore = f(
  hasWorkingCode,
  testsPass,
  securityScore,
  completeness
)
```

### Value Function
```
V(s) = average quality score of all implementations in subtree
```

### Policy
```
π(s) = spawnPattern selection based on task type
```

## 5. Evidence from Usage Patterns

When users complain "it only does research, not implementation," they're actually saying:
- **Simulations too shallow**: Not reaching terminal nodes with actual code
- **Rewards misaligned**: High scores for research, not implementation
- **Exploration bias**: Always exploring new branches instead of exploiting good paths

This is EXACTLY what happens in poorly-tuned MCTS!

## 6. The "Aha!" Moment

The feedback from users revealed the truth:
> "Axiom MCP would be better named 'Axiom Research Assistant' - it's good at thinking about problems but incapable of solving them."

Translation: **The MCTS is optimized for exploration (research) not exploitation (implementation)**

## 7. Why MCTS is the Right Approach

For code generation, MCTS is optimal because:

1. **Compositional**: Code has natural hierarchical structure
2. **Evaluable**: Can run tests to get objective rewards
3. **Learnable**: Similar code patterns recur
4. **Parallelizable**: Multiple approaches can be tried
5. **Anytime**: Can stop and use best solution so far

## 8. The Fix is MCTS Tuning

The solution isn't to abandon MCTS, but to tune it:

```typescript
// Current (Research-biased)
explorationConstant: 2.0,      // Too high!
simulationDepth: 'shallow',    // Just planning
rewardFunction: 'theoretical', // Rewards thinking

// Fixed (Implementation-biased)  
explorationConstant: 0.5,      // Exploit good paths
simulationDepth: 'terminal',   // Full implementation
rewardFunction: 'empirical',   // Rewards working code
```

## Conclusion

Axiom MCP doesn't just *use* MCTS - it **IS** MCTS. The recursive task spawning creates the tree, the Claude executions are the simulations, the quality evaluations are the rewards, and the retry logic is the learning.

The genius is that this emerged naturally from the problem structure. The flaw is that it's tuned for exploration (research) when users want exploitation (implementation).

**We don't need to add MCTS to Axiom - we need to recognize it's already there and tune it properly!**