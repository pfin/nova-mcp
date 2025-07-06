# The MCTS Realization: Summary

## Key Insight

Axiom MCP **IS** Monte Carlo Tree Search. Not similar to it, not inspired by it - it literally implements the MCTS algorithm for code generation tasks.

## Evidence

1. **Tree Structure**: Tasks form a tree with parent-child relationships
2. **Selection**: Choosing which task to spawn next (currently random, should be UCB1)
3. **Expansion**: Creating subtasks from a parent task
4. **Simulation**: Running Claude Code to generate solutions
5. **Backpropagation**: Updating task status and retrying based on quality

## Why This Matters

Understanding that Axiom IS MCTS explains everything:

- **Why parallel execution fails**: Trying to run MCTS simulations in parallel without proper synchronization
- **Why it only does research**: Simulations are too shallow (stop at planning)
- **Why users are frustrated**: The MCTS is tuned for exploration (research) not exploitation (implementation)
- **Why it has potential**: MCTS is the optimal approach for this problem!

## The Fix is Simple

We don't need to redesign Axiom MCP. We need to:

1. **Add MCTS statistics**: Visit counts and cumulative rewards to TaskStatus
2. **Implement UCB1**: Replace random selection with proper exploration/exploitation balance
3. **Deepen simulations**: Don't stop at planning - continue to working code
4. **Fix reward function**: Reward implementation, not research

## Code Changes Needed

```typescript
// 1. Enhance TaskStatus
interface TaskStatus {
  // ... existing fields ...
  
  // Add MCTS statistics
  visits: number;
  totalReward: number;
  averageReward: number;
}

// 2. Implement UCB1 selection
function selectNextTask(tasks: TaskStatus[]): TaskStatus {
  return tasks.reduce((best, task) => {
    const ucb1 = calculateUCB1(task);
    return ucb1 > calculateUCB1(best) ? task : best;
  });
}

// 3. Fix simulation depth
const IMPLEMENTATION_PROMPT = `
You MUST write actual working code, not descriptions.
Continue until you have:
1. Complete implementation files
2. Test files that pass
3. Verification that it works
`;

// 4. Fix reward function
function calculateReward(output: string): number {
  const hasCode = /```[\s\S]+```/.test(output);
  const hasFiles = /Write|Created|Updated/.test(output);
  const testsPass = /test.*pass|✓/.test(output);
  
  // Reward implementation, not planning
  return hasCode * 0.3 + hasFiles * 0.4 + testsPass * 0.3;
}
```

## Why MCTS is Perfect for Code Generation

1. **Natural tree structure**: Code decomposes hierarchically
2. **Expensive evaluation**: Running code takes time (perfect for MCTS)
3. **Clear rewards**: Tests pass/fail, code works/doesn't
4. **Reusable patterns**: Similar tasks have similar solutions (transposition table)
5. **Anytime algorithm**: Can stop early with best solution so far

## The Beautiful Accident

Axiom MCP accidentally evolved into MCTS because:
- The problem naturally has tree structure
- Quality evaluation provides rewards
- Retry logic learns from failures
- Parallel execution attempts multiple paths

The developers built MCTS without realizing it!

## Next Steps

1. Acknowledge that Axiom MCP IS MCTS
2. Add the missing MCTS components (stats, UCB1)
3. Tune parameters for implementation over research
4. Document it as "MCTS for Code Generation"
5. Publish paper: "Emergent MCTS in Hierarchical Code Generation"

## Conclusion

The user feedback "it only does research" isn't a bug report - it's a precise diagnosis that the MCTS parameters are tuned for exploration when users want exploitation. The fix isn't architectural; it's parametric.

Axiom MCP is already brilliant. It just needs its dials turned from "research mode" to "implementation mode."