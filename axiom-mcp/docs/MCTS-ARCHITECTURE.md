# Axiom MCP as Monte Carlo Tree Search (MCTS)

## The MCTS Connection

Axiom MCP's recursive task spawning and evaluation system is fundamentally an implementation of Monte Carlo Tree Search (MCTS) applied to code generation and task completion. This document explores this connection and how we can leverage MCTS principles to improve the system.

## Core MCTS Components in Axiom MCP

### 1. **Selection** (Current: `axiom_mcp_spawn`)
- Choose which branch of the task tree to explore
- Currently uses patterns: decompose, parallel, sequential, recursive
- **MCTS Enhancement**: Add UCB1 (Upper Confidence Bound) scoring to balance exploration vs exploitation

### 2. **Expansion** (Current: Task spawning)
- Create new child tasks from a parent task
- Currently limited to predefined spawn patterns
- **MCTS Enhancement**: Dynamic expansion based on task complexity and success rates

### 3. **Simulation/Rollout** (Current: `claude -p` execution)
- Execute tasks to completion using Claude Code
- Currently no lightweight simulation - full execution only
- **MCTS Enhancement**: Add fast "simulation" mode for quick feasibility checks

### 4. **Backpropagation** (Current: `axiom_mcp_evaluate`)
- Propagate quality scores up the tree
- Currently binary (pass/fail) with retry
- **MCTS Enhancement**: Continuous scoring with weighted success metrics

## MCTS Formalization for Code Generation

```typescript
interface MCTSNode {
  // State representation
  state: {
    task: string;
    context: CodeContext;
    constraints: Constraint[];
  };
  
  // MCTS statistics
  visits: number;
  totalReward: number;
  averageReward: number;
  
  // Tree structure
  parent: MCTSNode | null;
  children: MCTSNode[];
  untriedActions: Action[];
  
  // Code-specific
  implementation?: {
    code: string;
    tests: string;
    verified: boolean;
  };
}

interface MCTSConfig {
  // Exploration constant (√2 is typical)
  explorationConstant: number;
  
  // Simulation depth limit
  maxSimulationDepth: number;
  
  // Time/iteration budget
  computationalBudget: {
    maxTime: number;
    maxIterations: number;
  };
  
  // Code-specific parameters
  codeGeneration: {
    syntaxCheckOnly: boolean;  // Fast simulation
    runTests: boolean;         // Full rollout
    securityScan: boolean;     // Quality check
  };
}
```

## UCB1 Selection Formula

The UCB1 (Upper Confidence Bound) algorithm balances exploration and exploitation:

```
UCB1 = averageReward + C * sqrt(ln(parentVisits) / nodeVisits)
```

Where:
- `averageReward`: Historical success rate of this branch
- `C`: Exploration constant (typically √2)
- `parentVisits`: Total simulations from parent
- `nodeVisits`: Simulations through this node

## Proposed MCTS-Enhanced Architecture

```typescript
class AxiomMCTS {
  private root: MCTSNode;
  private config: MCTSConfig;
  
  async search(initialTask: string): Promise<Implementation> {
    this.root = this.createNode(initialTask);
    
    while (!this.budgetExhausted()) {
      // 1. Selection - traverse tree using UCB1
      const leaf = this.select(this.root);
      
      // 2. Expansion - add new child if not terminal
      if (!this.isTerminal(leaf) && leaf.visits > 0) {
        const child = this.expand(leaf);
        leaf = child;
      }
      
      // 3. Simulation - run lightweight or full execution
      const reward = await this.simulate(leaf);
      
      // 4. Backpropagation - update statistics
      this.backpropagate(leaf, reward);
    }
    
    // Return best implementation found
    return this.extractBestImplementation(this.root);
  }
  
  private select(node: MCTSNode): MCTSNode {
    while (!this.isLeaf(node)) {
      node = this.selectBestChild(node);
    }
    return node;
  }
  
  private selectBestChild(node: MCTSNode): MCTSNode {
    let bestScore = -Infinity;
    let bestChild = null;
    
    for (const child of node.children) {
      const score = this.ucb1(child, node);
      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }
    
    return bestChild!;
  }
  
  private ucb1(node: MCTSNode, parent: MCTSNode): number {
    if (node.visits === 0) return Infinity;
    
    const exploitation = node.averageReward;
    const exploration = this.config.explorationConstant * 
      Math.sqrt(Math.log(parent.visits) / node.visits);
    
    return exploitation + exploration;
  }
}
```

## Reward Function Design

The reward function is critical for MCTS success. For code generation:

```typescript
interface RewardComponents {
  // Functional correctness (0-1)
  testsPassing: number;
  
  // Code quality (0-1)
  codeQuality: {
    complexity: number;      // Cyclomatic complexity score
    readability: number;     // Based on naming, structure
    idiomaticness: number;   // Follows language best practices
  };
  
  // Security (0-1)
  securityScore: number;      // From security scanner
  
  // Performance (0-1)
  performanceScore?: number;  // Optional benchmark results
  
  // Completeness (0-1)
  completeness: {
    hasImplementation: boolean;
    hasTests: boolean;
    hasDocumentation: boolean;
    handleErrors: boolean;
  };
}

function calculateReward(components: RewardComponents): number {
  // Weighted combination
  const weights = {
    testsPassing: 0.4,      // Most important
    security: 0.2,          // Critical for production
    codeQuality: 0.2,       // Maintainability
    completeness: 0.15,     // All pieces present
    performance: 0.05       // Nice to have
  };
  
  // Calculate weighted score
  let reward = 0;
  reward += weights.testsPassing * components.testsPassing;
  reward += weights.security * components.securityScore;
  reward += weights.codeQuality * (
    (components.codeQuality.complexity + 
     components.codeQuality.readability + 
     components.codeQuality.idiomaticness) / 3
  );
  
  // ... etc
  
  return reward;
}
```

## Fast Simulation vs Full Rollout

To make MCTS efficient, we need both fast simulations and full rollouts:

### Fast Simulation (Syntax Check Only)
```typescript
async function fastSimulation(task: string): Promise<number> {
  // Quick syntax and type checking only
  const result = await claudeCode.execute(task, {
    systemPrompt: "Generate code outline with type signatures only",
    timeout: 30000,  // 30 seconds
    verifyMode: 'syntax-only'
  });
  
  // Basic scoring based on structure
  return evaluateStructure(result);
}
```

### Full Rollout (Complete Implementation)
```typescript
async function fullRollout(task: string): Promise<number> {
  // Complete implementation with tests
  const result = await axiomMcpImplement({
    task,
    verifyWith: ['npm test', 'npm run lint'],
    securityScan: true,
    acceptanceCriteria: {
      hasWorkingCode: true,
      testsPass: true,
      noVulnerabilities: true
    }
  });
  
  return calculateReward(result);
}
```

## Progressive Deepening

Like chess engines, we can use progressive deepening:

```typescript
async function progressiveSearch(task: string): Promise<Implementation> {
  let bestImplementation = null;
  let depth = 1;
  
  while (!this.timeExpired()) {
    // Search to current depth
    const result = await this.searchToDepth(task, depth);
    
    // Keep best so far
    if (result.reward > (bestImplementation?.reward || 0)) {
      bestImplementation = result;
    }
    
    // Increase depth for next iteration
    depth++;
  }
  
  return bestImplementation;
}
```

## Domain-Specific Enhancements

### 1. **Action Space Reduction**
Instead of generating arbitrary code, constrain actions to:
- Design patterns (Factory, Observer, etc.)
- API patterns (REST, GraphQL, gRPC)
- Testing patterns (Unit, Integration, E2E)

### 2. **Transposition Table**
Cache similar tasks to avoid redundant work:
```typescript
class TranspositionTable {
  private cache = new Map<string, Implementation>();
  
  getKey(task: string, context: Context): string {
    // Normalize task description
    const normalizedTask = this.normalize(task);
    const contextHash = this.hashContext(context);
    return `${normalizedTask}:${contextHash}`;
  }
  
  get(task: string, context: Context): Implementation | null {
    return this.cache.get(this.getKey(task, context)) || null;
  }
}
```

### 3. **Opening Book**
Pre-computed solutions for common tasks:
```typescript
const OPENING_BOOK = {
  "create REST API endpoint": RestApiTemplate,
  "implement authentication": AuthTemplate,
  "add database migration": MigrationTemplate,
  // etc.
};
```

## Parallel MCTS (Root Parallelization)

Run multiple MCTS instances in parallel:

```typescript
async function parallelMCTS(task: string, workers: number = 4): Promise<Implementation> {
  const promises = Array(workers).fill(0).map(() => 
    new AxiomMCTS().search(task)
  );
  
  const results = await Promise.all(promises);
  
  // Combine results - take best or merge insights
  return selectBest(results);
}
```

## Comparison with Current Axiom MCP

| Feature | Current Axiom MCP | MCTS-Enhanced |
|---------|------------------|---------------|
| Selection | Random/Pattern-based | UCB1 Score |
| Expansion | Fixed patterns | Dynamic based on scores |
| Simulation | Full execution only | Fast + Full modes |
| Backpropagation | Binary pass/fail | Continuous scores |
| Memory | No history | Transposition table |
| Parallelism | Fails often | Root parallelization |

## Implementation Roadmap

### Phase 1: Add MCTS Statistics
- Add visit counts and reward tracking to tasks
- Implement UCB1 selection
- Create reward function

### Phase 2: Fast Simulation
- Implement syntax-only checking
- Add structure evaluation
- Create simulation budget

### Phase 3: Advanced Features
- Transposition table
- Opening book
- Progressive deepening
- Parallel search

## Conclusion

By recognizing Axiom MCP as an MCTS implementation, we can:
1. Apply proven MCTS enhancements
2. Balance exploration vs exploitation properly
3. Make search more efficient with fast simulations
4. Learn from previous attempts
5. Provide theoretical guarantees on convergence

The shift from "research tool" to "implementation tool" becomes a shift from "random tree search" to "guided MCTS with proper scoring and backpropagation."