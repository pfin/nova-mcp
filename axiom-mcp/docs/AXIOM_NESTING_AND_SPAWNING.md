# Axiom Nesting and Spawning: Research Tasks Creating Sub-Tasks

## Overview

One of Axiom MCP v4's most powerful features is the ability for tasks to spawn sub-tasks. This is particularly useful for research tasks that discover multiple implementation opportunities.

## How It Works

### 1. Research Task with Time Boxing

When you start a research task with the RESEARCH-AXIOM hook (priority 105):

```typescript
axiom_spawn({
  prompt: "Research different approaches to implement factorial functions",
  researchTimeLimit: 300000, // 5 minutes (default)
  verboseMasterMode: true
});
```

The hook:
- Detects research keywords (research, analyze, explore, investigate, study, examine)
- Allows the task to proceed (bypassing validation)
- Sets up time monitoring with configurable limit
- Warns at 75% of time used
- Forces implementation at 100% of time

### 2. Spawning Sub-Tasks During Research

During execution, the research task can call axiom_spawn to create implementation tasks:

```typescript
// Inside the research task's execution
axiom_spawn({
  prompt: "Implement factorial.py with recursive and iterative versions",
  spawnPattern: "single"
});

axiom_spawn({
  prompt: "Implement factorial.js with memoization optimization",
  spawnPattern: "single"
});

axiom_spawn({
  prompt: "Implement Factorial.java with BigInteger for large numbers",
  spawnPattern: "single"
});
```

### 3. Parallel Execution

The spawned tasks run in parallel, each:
- Has its own task ID
- Tracks its parent task ID
- Runs independently
- Reports progress separately
- Can be monitored individually

### 4. Hook Coordination

Multiple hooks work together:

#### RESEARCH-AXIOM (Priority 105)
- Allows research prompts through
- Monitors time usage
- Suggests spawning sub-tasks in warnings
- Extracts insights from output
- Forces implementation after time limit

#### META-AXIOM (Priority 92)
- Learns that research + spawning = success
- Learns that pure research = failure
- Builds patterns over time
- Blocks known failure patterns

#### TASK-MONITOR (Priority 85)
- Checks all tasks every 15 seconds
- Detects if research is stuck
- Detects if sub-tasks are progressing
- Can intervene if needed

#### VALIDATION (Priority 100)
- Would normally block research
- But RESEARCH-AXIOM runs first (105)
- Sub-tasks must pass validation

## Example Flow

```
Time    Event
0:00    Research task starts
0:30    Research discovers recursive approach → spawns Python task
0:45    Research discovers memoization → spawns JavaScript task  
1:00    Research discovers BigInteger need → spawns Java task
1:30    All three implementation tasks running in parallel
2:00    Files being created by sub-tasks
3:45    Warning: 1.25 minutes remaining in research
4:00    Implementation tasks complete
5:00    Research time limit → forced to conclude
```

## Benefits

1. **Balanced Exploration**: Research is allowed but time-boxed
2. **Parallel Implementation**: Multiple approaches tested simultaneously
3. **Learning System**: META-AXIOM learns successful patterns
4. **Automatic Scaling**: Spawn as many sub-tasks as needed
5. **Progress Tracking**: Each task monitored independently

## Configuration

### Research Time Limits

```typescript
// Default: 5 minutes
axiom_spawn({
  prompt: "Research...",
  researchTimeLimit: 300000  // milliseconds
});

// Quick research: 2 minutes
axiom_spawn({
  prompt: "Quick research...",
  researchTimeLimit: 120000
});

// Deep research: 10 minutes
axiom_spawn({
  prompt: "Deep research...",
  researchTimeLimit: 600000
});
```

### Warning Times

Warnings appear at 75% of the time limit:
- 5 minute research → warning at 3:45
- 2 minute research → warning at 1:30
- 10 minute research → warning at 7:30

## Best Practices

1. **Include "axiom_spawn" in research prompts**: Tell the research task to spawn implementations
2. **Be specific about sub-tasks**: Give clear implementation instructions
3. **Use appropriate time limits**: Quick research (2m), normal (5m), deep (10m)
4. **Monitor progress**: Use axiom_status to check all spawned tasks
5. **Let parallelism work**: Don't wait for one task before spawning another

## What Happens If Research Doesn't Spawn?

If a research task doesn't spawn any implementation tasks:

1. **At warning time (75%)**: Reminder to spawn sub-tasks
2. **At time limit (100%)**: Forced to convert insights to tasks
3. **META-AXIOM learns**: This pattern marked as less successful
4. **Next time**: Similar prompts may be blocked or modified

## Technical Details

### Task Hierarchy

```
research-001 (parent)
├── impl-python-001 (child)
├── impl-js-001 (child)
└── impl-java-001 (child)
```

### Database Tracking

Each spawned task records:
- Parent task ID
- Start time
- Prompt
- Output
- Success/failure
- Files created

### Hook Execution Order

1. RESEARCH-AXIOM (105) - Allows research through
2. VALIDATION (100) - Skipped for research
3. META-AXIOM (92) - Tracks patterns
4. TASK-MONITOR (85) - Monitors progress
5. Other hooks by priority...

## Limitations

1. **Recursive spawning depth**: No built-in limit, but be reasonable
2. **Resource usage**: Each task uses memory and CPU
3. **PTY limitations**: Each needs a pseudo-terminal
4. **Coordination**: Tasks run independently, no direct communication

## Future Enhancements

1. **Task communication**: Allow tasks to share results
2. **Dependency management**: Wait for specific tasks
3. **Resource pooling**: Limit concurrent executions
4. **Result aggregation**: Combine outputs from sub-tasks