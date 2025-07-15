# Axiom v5 Parallel Executor Design

## Overview

The Parallel Executor manages multiple Claude instances running simultaneously, each working on orthogonal tasks that don't interfere with each other. It aggressively monitors and kills unproductive instances to maximize efficiency.

## Key Components

### 1. ParallelExecutor
- Spawns up to 10 Claude instances simultaneously
- Each instance gets its own isolated workspace directory
- Monitors all instances for productivity
- Kills idle or unproductive instances
- Redistributes failed tasks to new instances
- Merges results when all tasks complete

### 2. Productivity Monitoring
Each instance is scored on:
- **Output rate**: Lines of output per second
- **File creation**: Bonus points for creating files
- **Idle time**: Penalty for no activity

Instances with low productivity scores are killed after a timeout.

### 3. Task Decomposition
Tasks are decomposed into orthogonal chunks that can run in parallel:
- **Backend API**: Server code, routes, models
- **Frontend UI**: React/HTML/CSS components  
- **Database**: Schema, migrations, sample data
- **Tests**: Unit tests, integration tests
- **Documentation**: API docs, user guides

## Shadow Protocol: Aggressive Instance Management

The executor is intentionally aggressive about killing instances:

1. **Idle Timeout**: 30 seconds without activity = death
2. **Unproductive Timeout**: 2 minutes with low score = death
3. **Minimum Score**: Below 20/100 productivity = at risk
4. **No TODO Tolerance**: Instances writing TODO lists get penalized
5. **File Creation Bonus**: Creating files boosts score significantly

## Implementation Status

Currently implemented:
- ✅ Core ParallelExecutor class
- ✅ Instance spawning and management
- ✅ Productivity scoring system
- ✅ Aggressive killing logic
- ✅ Task redistribution on failure
- ✅ MCP tool integration
- ⚠️ Using stub PtyExecutor (needs real implementation)

## Usage Example

```typescript
// Decompose and execute in parallel
const tasks = [
  { id: 'backend', prompt: 'Create Express API...', priority: 1 },
  { id: 'frontend', prompt: 'Create React UI...', priority: 1 },
  { id: 'database', prompt: 'Create schema...', priority: 1 }
];

const executor = new ParallelExecutor({
  maxInstances: 3,
  enableAggressiveKilling: true
});

const results = await executor.execute(tasks);
```

## Future Enhancements

1. **Smart Decomposition**: ML-based task decomposition
2. **Dependency Graphs**: Handle task dependencies
3. **Resource Allocation**: CPU/memory limits per instance
4. **Result Synthesis**: Smart merging of parallel outputs
5. **MCTS Integration**: Monte Carlo tree search for optimal paths