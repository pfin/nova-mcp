# Axiom V4 Current State - January 7, 2025

## What We've Implemented

### Core Architecture
1. **Non-blocking execution** - Tasks run in background when `verboseMasterMode: true`
2. **Task tracking** - All tasks stored with executor references
3. **Bidirectional communication** - Can send messages to running tasks
4. **PTY-based execution** - Real terminal for running `claude` command

### Available Tools

#### 1. axiom_spawn
Starts a new task execution
```typescript
axiom_spawn({
  prompt: string,              // What to ask Claude to do
  verboseMasterMode?: boolean, // Enable non-blocking mode
  spawnPattern?: 'single' | 'parallel',
  spawnCount?: number
})
// Returns: { taskId: "task-xxx", status: "executing", ... }
```

#### 2. axiom_send  
Send message/command to running task
```typescript
axiom_send({
  taskId: string,   // Task to send to
  message: string   // Message to send
})
// Returns: "Message sent to task-xxx: [message]"
```

#### 3. axiom_status
Check status of tasks
```typescript
axiom_status({
  taskId?: string  // Optional, shows all if not provided
})
// Returns: Task status with runtime and output line count
```

#### 4. axiom_output
Get accumulated output from task
```typescript
axiom_output({
  taskId: string,
  tail?: number    // Optional, last N lines only
})
// Returns: Full or partial output text
```

## How It Works

### Execution Flow
1. **axiom_spawn** creates PTY and runs `claude "prompt"`
2. In verbose mode, returns immediately with task ID
3. Claude output accumulates in task.output
4. **axiom_send** writes directly to Claude's stdin via PTY
5. **axiom_output** returns accumulated output anytime
6. Task completes when Claude exits

### Key Components
- **HookOrchestrator** - Routes all requests, manages tasks
- **PtyExecutor** - Creates PTY, runs claude, handles I/O
- **Task Storage** - Map of active tasks with executor refs

## Testing Workflow

### Test 1: Basic Interaction
```bash
# Start MCP inspector
npx @modelcontextprotocol/inspector dist-v4/index.js

# In inspector:
1. axiom_spawn({ prompt: "Create a fibonacci function in Python", verboseMasterMode: true })
   # Note the task ID returned

2. axiom_send({ taskId: "task-xxx", message: "Make it recursive and add memoization" })
   # Sends additional instruction

3. axiom_output({ taskId: "task-xxx" })
   # Check output so far

4. axiom_status()
   # See all running tasks
```

### Test 2: Language Switch
```bash
1. axiom_spawn({ prompt: "Create a web server in Python using Flask", verboseMasterMode: true })
2. axiom_send({ taskId: "task-xxx", message: "Actually, use Node.js and Express instead" })
3. axiom_output({ taskId: "task-xxx", tail: 20 })
4. Check if server.js was created instead of app.py
```

## Current Limitations

1. **No streaming notifications** - Must poll with axiom_output
2. **No automatic interrupts** - Must manually detect when to intervene
3. **Single executor type** - Only PTY executor implemented
4. **No parallel execution** - spawnCount not implemented yet

## Next Steps

### Step 3: Implement Notifications
Add MCP notification support for real-time streaming:
```typescript
sendNotification({
  method: "notifications/message",
  params: { level: "info", data: `[${taskId}] ${output}` }
})
```

### Step 4: Full Async Architecture
1. WebSocket server for better streaming
2. Worker processes for true parallelism
3. Message routing between tasks
4. Interrupt coordination

## File Locations

- `/src-v4/index.ts` - MCP server and tool handlers
- `/src-v4/core/hook-orchestrator.ts` - Request routing and task management
- `/src-v4/executors/pty-executor.ts` - PTY creation and I/O handling
- `/docs/` - All documentation including this file

## How to Use Right Now

1. Build: `npm run build:v4`
2. Run: `npx @modelcontextprotocol/inspector dist-v4/index.js`
3. Start task with `verboseMasterMode: true`
4. Send messages while it runs
5. Check output periodically
6. Verify files created match your interventions

This gives us the foundation for the Claude-chat-like experience - we just need to add streaming!