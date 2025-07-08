# Axiom V4 Streaming Test Plan

## Current Implementation Status

### What We've Built
1. **axiom_spawn** - Starts tasks with PTY executor
2. **axiom_send** - Sends messages to running tasks
3. **axiom_status** - Checks task status

### Key Architecture Points
- PTY executor runs `claude "prompt"` command
- Tasks store executor reference for message sending
- Non-blocking execution in verbose mode
- Task tracking in HookOrchestrator

## Test Scenarios

### Test 1: Basic Message Sending
```javascript
// 1. Start a task
axiom_spawn({ 
  prompt: "Create a calculator program in Python", 
  verboseMasterMode: true 
})
// Returns: { taskId: "task-123", status: "executing" }

// 2. Send redirect message
axiom_send({ 
  taskId: "task-123", 
  message: "Actually, please make it in Java instead of Python" 
})
// Returns: "Message sent to task-123"

// 3. Check status
axiom_status({ taskId: "task-123" })
// Returns: Task status with output lines
```

### Test 2: Check File Creation
After task completes:
- Check if Calculator.java exists (not calculator.py)
- Verify the task responded to the message

### Test 3: Output Reading
```javascript
// While task is running
axiom_status({ taskId: "task-123" })
// Should show increasing output lines
```

## Expected Behavior

1. **Task starts** - Claude begins creating Python calculator
2. **Message received** - PTY writes "make it Java" to Claude's stdin
3. **Claude pivots** - Switches to creating Java code
4. **File created** - Calculator.java instead of calculator.py

## Current Limitations

1. **No streaming output** - Need to implement notifications
2. **Manual timing** - Must send message while task runs
3. **No output tool** - Can't read full output yet

## Next Steps

1. **Step 1** ✓ - Send messages to tasks (DONE)
2. **Step 2** - Test file creation after message
3. **Step 3** - Implement output reading
4. **Step 4** - Add notification streaming
5. **Step 5** - Full async architecture