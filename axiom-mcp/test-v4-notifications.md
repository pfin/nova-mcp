# Testing Axiom V4 with Notifications

## Setup
```bash
npx @modelcontextprotocol/inspector dist-v4/index.js
```

## Test 1: Basic Streaming
```javascript
// 1. Start task with streaming
axiom_spawn({ 
  prompt: "Create a Python script that prints numbers 1-10 with a delay", 
  verboseMasterMode: true 
})

// Expected:
// - Returns immediately with task ID
// - Notifications start appearing with [task-xxx] prefix
// - See Claude's output character by character
// - File creation events appear in stream
```

## Test 2: Interactive Redirect
```javascript
// 1. Start task
axiom_spawn({ 
  prompt: "Create a calculator in Python", 
  verboseMasterMode: true 
})
// Note task ID

// 2. While streaming, send redirect
axiom_send({ 
  taskId: "task-xxx", 
  message: "Make it object-oriented with a Calculator class" 
})

// Expected:
// - Notifications show Claude receiving message
// - Output changes to implement class-based approach
// - calculator.py contains Calculator class
```

## Test 3: Multiple Concurrent Tasks
```javascript
// 1. Start first task
axiom_spawn({ 
  prompt: "Create a web server in Python", 
  verboseMasterMode: true 
})

// 2. Start second task
axiom_spawn({ 
  prompt: "Create a database connection module", 
  verboseMasterMode: true 
})

// 3. Start third task
axiom_spawn({ 
  prompt: "Create an authentication system", 
  verboseMasterMode: true 
})

// Expected:
// - Three streams with different [task-xxx] prefixes
// - All run concurrently
// - Can send messages to specific tasks
// - axiom_status shows all three running
```

## Test 4: Monitoring Without Streaming
```javascript
// 1. Start without verboseMasterMode (no streaming)
axiom_spawn({ 
  prompt: "Create a REST API" 
})

// 2. Check progress periodically
axiom_output({ taskId: "task-xxx" })
axiom_status({ taskId: "task-xxx" })

// Expected:
// - No notifications
// - Must poll with axiom_output
// - Still works, just not real-time
```

## What to Look For

### Success Indicators
1. **Immediate return** - axiom_spawn doesn't block
2. **Streaming notifications** - Output appears character by character
3. **Task prefixes** - Each notification shows [task-xxx]
4. **File creation** - Files appear when Claude creates them
5. **Message receipt** - axiom_send messages appear in stream

### Implementation Details
- Notifications use MCP's notification system
- Format: `notifications/message` with level "info"
- Data includes task ID prefix for identification
- Stream handler in orchestrator sends notifications
- PTY output flows through to notifications

## Current Status
- ✅ Notification sender created in tool handler
- ✅ Passed through to orchestrator
- ✅ Stream handler sends notifications
- ✅ Response indicates streaming enabled
- 🔄 Ready for testing!