# Visual Proof: Axiom MCP = MCTS

## Side-by-Side Comparison

### Traditional MCTS (Game/Planning)
```
                 [Root State]
                /     |      \
          [Move A] [Move B] [Move C]    <- Selection (UCB1)
             /         |
        [A1] [A2]   [New!]              <- Expansion
                       |
                  [Simulation]          <- Random Playout
                       ↓
                   Win/Loss             <- Reward
                       ↑
                 Backpropagate          <- Update Statistics
```

### Axiom MCP (Code Generation)
```
           [Create Unit Tests]
          /        |         \
    [TDD Style] [BDD Style] [Classic]   <- spawnPattern (selection)
       /           |
  [Jest] [Mocha]  [New!]                <- Subtask Creation (expansion)
                    |
              [Claude -p]               <- Code Generation (simulation)
                    ↓
              Tests Pass?               <- Quality Score (reward)
                    ↑
            Update Status               <- Status Manager (backprop)
```

## Direct Mapping

| MCTS Concept | Axiom MCP Implementation |
|--------------|-------------------------|
| Node | `TaskStatus` object |
| State | Task prompt + context |
| Action | Spawn pattern + subtask |
| Tree | `childTasks` + `parentTask` |
| Simulation | `claudeCode.execute()` |
| Reward | `evaluationScore` |
| Visit Count | Would be `task.visits` |
| UCB1 | Currently random (THE BUG!) |

## The Smoking Gun: Parallel Failures

Why do parallel executions fail? Because Axiom is trying to run MCTS simulations in parallel without proper synchronization:

```typescript
// This is MCTS trying to simulate multiple branches!
const promises = prompts.map(({ id, prompt, options }) => 
  this.executeAsync(prompt, options)
);
return Promise.all(promises);  // <- Parallel MCTS simulations
```

## Proof in the Terminal Output

Look at actual Axiom output:
```
[SPAWN] Executing parent task to generate 3 subtasks...
[SPAWN] Generated 3 subtasks
[SPAWN] Executing subtask 7f3a2...: Write unit tests for...
[SPAWN] Executing subtask 8b4c1...: Create integration tests...
[SPAWN] Executing subtask 9d5e0...: Implement E2E tests...
```

This is literally:
1. **Selection**: Parent task chosen
2. **Expansion**: 3 children created  
3. **Simulation**: Each child executed
4. **Backpropagation**: Results updated in tree

## The Recursive Pattern is MCTS Recursion

```typescript
if (input.spawnPattern === 'recursive' && childTask.depth < input.maxDepth) {
  // Recursively spawn more - this is MCTS going deeper!
  handleAxiomMcpSpawn({
    parentPrompt: subtask,
    spawnPattern: 'recursive',
    maxDepth: input.maxDepth,
  })
}
```

This is EXACTLY how MCTS explores deeper into promising branches!

## Why Quality Evaluation = Reward Function

The `axiom_mcp_evaluate` tool is literally computing MCTS rewards:

```typescript
const qualityScore = calculateQualityScore({
  hasRequiredElements,
  meetsExpectations,
  followsPatterns,
  passesTests
});

// This IS the reward in: V(s) = R(s) + γ * max V(s')
```

## The Missing Piece: Exploitation

Current Axiom always explores (researches) because it lacks:

```typescript
// MISSING: Selection based on past performance
function selectBestChild(node: TaskStatus): TaskStatus {
  // Currently: random or pattern-based
  // Should be: UCB1 = μ + C√(ln(N)/n)
}
```

## Conclusion with Visual Proof

```
User: "Create unit tests"
        |
        v
Axiom:  ┌─────────────────┐
        │ MCTS Tree Root  │ 
        │ "Create tests"  │
        └────────┬────────┘
                 │ Spawn 3 children
        ┌────────┴────────┬─────────────┐
        v                 v             v
   ┌─────────┐      ┌─────────┐   ┌─────────┐
   │ Unit    │      │ Integr. │   │ E2E     │
   │ Tests   │      │ Tests   │   │ Tests   │  
   └────┬────┘      └────┬────┘   └────┬────┘
        │                │              │
        v                v              v
   ❌ Research     ❌ Research    ❌ Research
   
PROBLEM: Simulations stop at planning, never reach implementation!

SOLUTION: Deeper simulations that produce actual code
```

Axiom MCP **IS** Monte Carlo Tree Search - it just needs its reward function fixed to reward implementation over research!