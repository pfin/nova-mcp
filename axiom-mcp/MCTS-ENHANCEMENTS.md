# MCTS Enhancements to Axiom MCP

## Summary of Changes

This document describes the Monte Carlo Tree Search (MCTS) enhancements made to Axiom MCP, demonstrating how the system fundamentally implements MCTS for task execution.

## BEFORE/AFTER/HOW Meta-Cognitive Principle

### What I Did
1. **Added BEFORE/AFTER/HOW as a core meta-cognitive principle** in the base system prompt
2. **Created scoring and validation** for meta-cognitive compliance
3. **Integrated meta-cognitive scores** into the reward calculation

### Why I Did It
- Forces deliberate planning before action (BEFORE)
- Ensures clear methodology (HOW)
- Promotes learning from results (AFTER)
- This mirrors MCTS's own phases: Selection → Expansion → Simulation → Backpropagation

### How It Works
```typescript
// In base-system-prompt.ts
export function calculateMetaCognitiveScore(output: string): {
  score: number;
  components: {
    before: boolean;  // Planning phase
    how: boolean;     // Methodology
    after: boolean;   // Review
    reflection: boolean; // Learning
  };
  feedback: string[];
}
```

The score directly affects task rewards:
```typescript
const metaCognitiveMultiplier = 0.8 + (metaCognitiveScore * 0.2);
parsedEval.score *= metaCognitiveMultiplier;
```

## MCTS Components in Axiom MCP

### 1. Selection (UCB1 Algorithm)
```typescript
// In axiom-mcp-spawn.ts
function calculateUCB1(
  childStats: { visits: number; averageReward: number },
  parentVisits: number,
  explorationConstant: number = Math.sqrt(2)
): number {
  if (!childStats || childStats.visits === 0) {
    return Infinity; // Unexplored actions have infinite score
  }
  
  const exploitation = childStats.averageReward;
  const exploration = explorationConstant * 
    Math.sqrt(Math.log(parentVisits) / childStats.visits);
  
  return exploitation + exploration;
}
```

### 2. Expansion (Dynamic Action Generation)
```typescript
// Generate possible actions based on task context
function generatePossibleActions(prompt: string, pattern: string): string[] {
  // Returns context-aware actions like:
  // - "Break into functional components"
  // - "Test-driven implementation"
  // - "Depth-first exploration"
}
```

### 3. Simulation (Fast vs Full Modes)
```typescript
// Fast simulation - structure only (30s timeout)
private async fastSimulation(task: string): Promise<ClaudeCodeResult> {
  // Returns code structure and signatures without full implementation
}

// Full simulation - complete implementation (5min timeout)
private async fullSimulation(task: string): Promise<ClaudeCodeResult> {
  // Returns working code with tests
}
```

### 4. Backpropagation (Reward Propagation)
```typescript
// In axiom-mcp-evaluate.ts
async function backpropagateReward(
  task: TaskStatus,
  reward: number,
  statusManager: StatusManager
): Promise<void> {
  let currentTask = task;
  let currentReward = reward;
  
  // Propagate up the tree with 0.9 decay factor
  while (currentTask && currentTask.parentTask) {
    const parentTask = statusManager.getTask(currentTask.parentTask);
    parentStats.totalReward += currentReward;
    parentStats.averageReward = parentStats.totalReward / parentStats.visits;
    currentReward *= 0.9; // Parent gets 90% of child's reward
    currentTask = parentTask;
  }
}
```

## Enhanced Task Status with MCTS Stats

```typescript
export interface TaskStatus {
  // ... existing fields ...
  
  // MCTS Statistics
  mctsStats?: {
    visits: number;           // Times this node was visited
    totalReward: number;      // Sum of all rewards
    averageReward: number;    // Average reward (totalReward/visits)
    untriedActions: string[]; // Actions not yet explored
    simulationMode?: 'fast' | 'full' | 'mixed';
    lastVisited?: Date;
  };
}
```

## New Tools

### axiom_mcp_spawn_mcts
A new spawning tool that uses full MCTS search:
```typescript
{
  parentPrompt: string,
  mctsConfig: {
    explorationConstant: number,  // UCB1 constant (default: √2)
    maxIterations: number,        // MCTS iterations
    maxDepth: number,            // Tree depth limit
    simulationMode: 'fast' | 'full' | 'mixed',
    minQualityThreshold: number  // Terminal node threshold
  }
}
```

## Evidence of MCTS Implementation

### Tree Structure
- Tasks have parent-child relationships
- Depth tracking for each node
- Child task arrays maintain tree structure

### Statistical Tracking
- Visit counts per node
- Reward accumulation and averaging
- Untried actions list for exploration

### Intelligent Selection
- UCB1 balances exploration vs exploitation
- High-performing branches get more visits
- Unexplored actions have infinite UCB1 score

### Quality-Based Termination
- Nodes become terminal when quality threshold is met
- Prevents unnecessary exploration of solved problems

## Benefits

1. **Better Quality**: Tasks that follow BEFORE/AFTER/HOW score higher
2. **Smarter Exploration**: UCB1 prevents wasting time on bad approaches
3. **Learning System**: Backpropagation helps identify successful patterns
4. **Efficiency**: Fast simulation mode for quick feasibility checks
5. **Theoretical Guarantees**: MCTS converges to optimal with enough iterations

## Usage Example

```javascript
// Traditional spawn (random exploration)
axiom_mcp_spawn({
  parentPrompt: "Implement a web scraper",
  spawnPattern: "decompose",
  spawnCount: 3
})

// MCTS spawn (intelligent exploration)
axiom_mcp_spawn_mcts({
  parentPrompt: "Implement a web scraper",
  mctsConfig: {
    maxIterations: 20,
    simulationMode: "mixed",
    minQualityThreshold: 0.8
  }
})
```

## Conclusion

Axiom MCP now implements true MCTS with:
- Proper selection using UCB1
- Dynamic expansion of promising branches
- Fast and full simulation modes
- Reward backpropagation up the tree
- Meta-cognitive scoring to ensure quality

The system balances exploration of new approaches with exploitation of proven solutions, leading to better outcomes with fewer wasted attempts.