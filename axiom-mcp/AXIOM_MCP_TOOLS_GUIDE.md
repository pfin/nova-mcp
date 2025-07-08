# Axiom MCP v4 Tools Guide for LLMs

## Overview
When you connect to the axiom-mcp-v4 server, you have access to 6 powerful tools for task execution and Claude instance orchestration. This guide explains each tool from an LLM's perspective.

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