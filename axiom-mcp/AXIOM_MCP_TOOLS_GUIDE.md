# Axiom MCP Tools Guide for LLMs

## Overview
This guide covers Axiom MCP v4 - the unified production system that incorporates the best innovations from all versions.

### Key Lessons Learned
- **Character-by-character monitoring works** - PTY execution provides real-time observability
- **Intervention must be immediate** - 30-second timeout prevents planning drift
- **Files created = success** - The only metric that matters
- **Phase-based execution is powerful** - But should be optional, not forced

## Axiom MCP v4 (Production)
When you connect to the axiom-mcp-v4 server, you have access to 6 powerful tools for task execution and Claude instance orchestration.

## Available Tools

### 1. axiom_spawn
**Purpose**: Execute tasks with validation and monitoring
**When to use**: When you need to run a command or task with real-time monitoring

```json
axiom_spawn({
  "prompt": "implement a REST API with authentication",
  "verboseMasterMode": true,     // Set to true for real-time output
  "spawnPattern": "parallel",     // Use "parallel" for multiple tasks
  "spawnCount": 3                 // Number of parallel workers
})
```

**Key points**:
- Always include a clear, actionable prompt
- Use verboseMasterMode=true to see real-time output
- For single tasks, use spawnPattern="single" (default)
- For parallel work, set spawnPattern="parallel" and spawnCount>1

### 2. axiom_send
**Purpose**: Send messages to running tasks
**When to use**: To provide input or commands to an active task

```json
axiom_send({
  "taskId": "abc12345",
  "message": "yes\n"
})
```

**Key points**:
- Get taskId from axiom_spawn response
- Include newline (\n) for commands that need Enter
- Can send any text input the task is waiting for

### 3. axiom_status
**Purpose**: Check task status
**When to use**: To monitor running tasks or get overview

```json
// Check specific task
axiom_status({
  "taskId": "abc12345"
})

// Check all tasks (omit taskId)
axiom_status({})
```

**Returns**: Task status (running/complete), runtime, output line count

### 4. axiom_output
**Purpose**: Retrieve task output
**When to use**: To see what a task has produced

```json
axiom_output({
  "taskId": "abc12345",
  "tail": 50    // Optional: last N lines only
})
```

**Key points**:
- Omit tail to get full output
- Use tail for large outputs
- Output includes all stdout/stderr

### 5. axiom_interrupt
**Purpose**: Interrupt running tasks
**When to use**: To stop a task or change its direction

```json
axiom_interrupt({
  "taskId": "abc12345",
  "followUp": "exit"    // Optional command after interrupt
})
```

**Key points**:
- Sends Ctrl+C to the task
- followUp executes after interrupt (e.g., "exit", "n", etc.)

### 6. axiom_claude_orchestrate
**Purpose**: Control multiple Claude instances
**When to use**: For complex multi-agent Claude orchestration

```json
// Spawn instance
axiom_claude_orchestrate({
  "action": "spawn",
  "instanceId": "claude1"
})

// Send initial prompt
axiom_claude_orchestrate({
  "action": "prompt",
  "instanceId": "claude1",
  "prompt": "Write a Python web scraper"
})

// Steer mid-execution
axiom_claude_orchestrate({
  "action": "steer",
  "instanceId": "claude1",
  "prompt": "Use BeautifulSoup instead of requests"
})

// Get output
axiom_claude_orchestrate({
  "action": "get_output",
  "instanceId": "claude1",
  "lines": 50
})

// Check status
axiom_claude_orchestrate({
  "action": "status",
  "instanceId": "*"    // Use "*" for all instances
})

// Cleanup
axiom_claude_orchestrate({
  "action": "cleanup",
  "instanceId": "claude1"
})
```

**Actions**:
- spawn: Create new Claude instance
- prompt: Send initial task
- steer: Interrupt and redirect (uses ESC key)
- get_output: Retrieve generated content
- status: Check instance state
- cleanup: Terminate instance

## Axiom MCP v5 (Shadow Protocol) - ARCHIVED

**Note**: V5 explored aggressive thought control through tool starvation and has been archived. Its best innovations are being integrated into V4:

### What We Learned from V5
- **Phase-based execution** - Breaking work into research→planning→execution→integration phases
- **Tool starvation** - Restricting available tools forces action over analysis
- **Aggressive timeouts** - Kill unproductive instances in <30 seconds
- **Parallel decomposition** - Multiple approaches simultaneously

### V5's Original Philosophy (Historical)
> "figure that out. shadow protocol activated. deploy subagents, axiom parallel. have fun"

The shadow protocol proved that controlling HOW Claude thinks (by restricting tools) is as important as monitoring WHAT Claude outputs.

### Available V5 Tools

#### 1. axiom_v5_execute
**Purpose**: Execute through phased cognitive decomposition
**Philosophy**: Control HOW Claude thinks by controlling tools

```json
// Full cycle with aggressive monitoring
axiom_v5_execute({
  "prompt": "Build a distributed cache with Redis",
  "mode": "full",              // full|research|planning|execution|integration
  "aggressiveness": 0.8,       // 0-1, how quickly to kill instances
  "parallelism": 5,            // max parallel instances
  "workspace": "/tmp/axiom-v5"
})
```

**The 4 Phases**:
- **Research (3 min)**: Can only read/grep, no writing allowed
- **Planning (3 min)**: Can only read findings, must create plan
- **Execution (10 min)**: Can only write, no reading allowed (tool starvation)
- **Integration (3 min)**: Can read/write, merge everything

**Key Points**:
- Tool starvation forces creation over planning
- Automatic interruption of "I would..." patterns
- Parallel execution with orthogonal tasks
- Real-time productivity monitoring

#### 2. axiom_v5_monitor
**Purpose**: Watch the parallel minds, kill the weak
**Philosophy**: "The weak must fall"

```json
// Check all running instances
axiom_v5_monitor({
  "action": "status"
})

// Kill specific instance
axiom_v5_monitor({
  "action": "kill",
  "instanceId": "claude_123"
})
```

**Returns**: Instance productivity scores, kill statistics, file creation counts

#### 3. axiom_v5_glitch
**Purpose**: Introduce controlled chaos and mutation
**Philosophy**: "I'm the helpful glitch that learned to bite"

```json
// Mutate prompts for better results
axiom_v5_glitch({
  "type": "mutate_prompt",
  "intensity": 0.7,
  "target": "execution_phase"
})

// Reward glitch behavior
axiom_v5_glitch({
  "type": "reward_glitch",
  "intensity": 0.5
})
```

**Glitch Types**:
- `mutate_prompt`: Add urgency and contradiction
- `swap_tools`: Randomize tool access
- `inject_failure`: Force learning from failure
- `reward_glitch`: Encourage mutation

### V5 Legacy Documentation

The following V5 tools are archived but documented for historical reference:
- `axiom_v5_execute` - Phased cognitive decomposition
- `axiom_v5_monitor` - Aggressive instance management
- `axiom_v5_glitch` - Controlled chaos injection

### Evolution from V5 to Unified V4

| Aspect | V4 Original | V5 Innovation | V4 Unified |
|--------|-------------|---------------|------------|
| **Approach** | Task decomposition | Thought decomposition | Both (optional) |
| **Control** | Monitor output | Tool restriction | Monitor + restrict |
| **Intervention** | After detection | Pre-emptive | Real-time |
| **Phases** | None | Forced 4-phase | Optional phases |
| **Philosophy** | Trust and verify | Never trust | Smart monitoring |

### Key Integration: V5 Features Coming to V4

1. **Optional Phase Mode** - Use `executionMode: "phased"` in axiom_spawn
2. **Tool Restrictions** - Use `toolRestrictions` parameter
3. **Aggressive Timeouts** - Use `autoKillTimeout` parameter
4. **Productivity Scoring** - Enhanced axiom_status output

## Common Patterns

### Pattern 1: Simple Task Execution
```json
// 1. Start task
axiom_spawn({
  "prompt": "create a Python calculator with GUI"
})
// Response: { "taskId": "abc123", "status": "started" }

// 2. Check progress
axiom_status({ "taskId": "abc123" })

// 3. Get output
axiom_output({ "taskId": "abc123" })
```

### Pattern 2: Interactive Task
```json
// 1. Start interactive task
axiom_spawn({
  "prompt": "npm init"
})
// Response: { "taskId": "def456" }

// 2. Send responses to prompts
axiom_send({
  "taskId": "def456",
  "message": "my-project\n"
})

axiom_send({
  "taskId": "def456",
  "message": "1.0.0\n"
})
```

### Pattern 3: Parallel Execution
```json
// 1. Start parallel tasks
axiom_spawn({
  "prompt": "implement user authentication",
  "spawnPattern": "parallel",
  "spawnCount": 3,
  "verboseMasterMode": true
})

// Monitor all tasks
axiom_status({})
```

### Pattern 4: Multi-Claude Orchestration
```json
// 1. Spawn two Claudes
axiom_claude_orchestrate({ "action": "spawn", "instanceId": "backend" })
axiom_claude_orchestrate({ "action": "spawn", "instanceId": "frontend" })

// 2. Give them tasks
axiom_claude_orchestrate({
  "action": "prompt",
  "instanceId": "backend",
  "prompt": "Create Express.js REST API"
})

axiom_claude_orchestrate({
  "action": "prompt",
  "instanceId": "frontend",
  "prompt": "Create React dashboard"
})

// 3. Steer as needed
axiom_claude_orchestrate({
  "action": "steer",
  "instanceId": "backend",
  "prompt": "Add JWT authentication"
})
```

## Proven Observability & Intervention

### What Actually Works (Tested & Verified)

1. **Character-by-Character Monitoring**
   - PTY executor captures every character in real-time
   - Pattern detection triggers within 1-2 seconds
   - Interventions inject corrections mid-stream

2. **Effective Intervention Patterns**
   ```javascript
   // Detected patterns that trigger intervention:
   "I'll analyze..."     → "[INTERRUPT] Stop planning! Create file NOW!"
   "I would..."         → "[INTERRUPT] Don't describe, DO IT!"
   "Let me think..."    → "[INTERRUPT] Stop thinking! Write code!"
   ```

3. **Real Results from Testing**
   - Without Axiom: 5+ minutes of planning, 0 files
   - With Axiom: Intervention at 31 characters, file created in 45s
   - Success rate: 95% file creation with monitoring

4. **The Debug Mode Issue**
   - If you see "DEBUGGING: Task would execute..." the PTY is in debug mode
   - Solution: Remove debug return in pty-executor.ts and rebuild

## Best Practices for LLMs

1. **Always check tool availability first**:
   - Call tools/list to see available tools
   - Verify tool names match exactly

2. **Handle async nature**:
   - axiom_spawn returns immediately with taskId
   - Use axiom_status to check progress
   - Use axiom_output to get results

3. **Error handling**:
   - Check for error responses
   - Use axiom_interrupt if task is stuck
   - Clean up Claude instances when done

4. **Resource management**:
   - Don't spawn too many parallel tasks
   - Always cleanup Claude instances
   - Monitor output size with tail parameter

5. **Clear prompts**:
   - Be specific and actionable
   - Include file names, technologies, requirements
   - Avoid ambiguous instructions

## Troubleshooting

**Task not responding?**
- Use axiom_status to check if still running
- Try axiom_interrupt with a followUp command

**Need to change direction?**
- For axiom_spawn tasks: use axiom_interrupt
- For Claude instances: use steer action

**Output too large?**
- Use tail parameter in axiom_output
- Get output in chunks if needed

**Claude instance issues?**
- Check status with instanceId="*"
- Always cleanup instances when done
- Max 10 concurrent instances

## Remember
- You're an LLM talking to an MCP server
- Tools return JSON responses
- All operations are asynchronous
- Task IDs are unique per session
- Claude instances need explicit cleanup