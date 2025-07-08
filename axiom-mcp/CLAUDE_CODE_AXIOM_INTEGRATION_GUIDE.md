# Claude Code + Axiom MCP Integration Guide

## Overview

This guide explains how to use Claude Code through Axiom MCP tools, combining the power of Claude's interactive mode with Axiom's task orchestration and monitoring capabilities.

## The Two-Layer Architecture

### Layer 1: Axiom MCP Tools (What You Call)
```json
axiom_spawn      // Start a Claude instance
axiom_send       // Send input to Claude
axiom_status     // Check task status
axiom_output     // Get Claude's output
axiom_interrupt  // Stop or redirect Claude
```

### Layer 2: Claude Code (What Runs)
- Interactive Claude session with full capabilities
- All keyboard shortcuts work
- All `/commands` available
- Vim mode, multiline input, etc.

## Complete Workflow

### 1. Starting a Claude Session

```javascript
// Start with a concrete task (required by Axiom validation)
axiom_spawn({
  "prompt": "Create auth.js with JWT authentication",
  "verboseMasterMode": true
})
// Returns: { "taskId": "task-123" }
```

### 2. Trust Dialog Sequence

```javascript
// Check output
axiom_output({ "taskId": "task-123" })
// See: "Do you trust the files in this folder?"

// Send trust confirmation
axiom_send({ "taskId": "task-123", "message": "1" })

// Wait for welcome screen
axiom_output({ "taskId": "task-123" })
// See: "Welcome to Claude Code!"
```

### 3. Sending Your Actual Request

```javascript
// Type your prompt
axiom_send({ 
  "taskId": "task-123", 
  "message": "Create auth.js with JWT login and refresh token endpoints"
})

// Submit with Ctrl+Enter
axiom_send({ "taskId": "task-123", "message": "\r" })
```

### 4. Using Claude Commands

```javascript
// Send any Claude command
axiom_send({ "taskId": "task-123", "message": "/help" })
axiom_send({ "taskId": "task-123", "message": "\r" })

// Use vim mode
axiom_send({ "taskId": "task-123", "message": "/vim" })
axiom_send({ "taskId": "task-123", "message": "\r" })

// Check model
axiom_send({ "taskId": "task-123", "message": "/model" })
axiom_send({ "taskId": "task-123", "message": "\r" })
```

### 5. Multiline Input

```javascript
// Start multiline mode
axiom_send({ "taskId": "task-123", "message": "Create a function that:\n" })
axiom_send({ "taskId": "task-123", "message": "1. Validates user input\n" })
axiom_send({ "taskId": "task-123", "message": "2. Hashes passwords\n" })
axiom_send({ "taskId": "task-123", "message": "3. Returns JWT token" })
axiom_send({ "taskId": "task-123", "message": "\r" })  // Submit
```

### 6. Interrupting and Steering

```javascript
// Method 1: Interrupt with follow-up
axiom_interrupt({
  "taskId": "task-123",
  "followUp": "[INTERRUPT: CHANGE TO TYPESCRIPT]"
})

// Method 2: Send interrupt command
axiom_send({ 
  "taskId": "task-123", 
  "message": "[INTERRUPT: ADD ERROR HANDLING]"
})
```

### 7. Using Context References

```javascript
// Reference files
axiom_send({ 
  "taskId": "task-123", 
  "message": "Update the login function in #auth.js to use bcrypt"
})
axiom_send({ "taskId": "task-123", "message": "\r" })

// Reference memory
axiom_send({ 
  "taskId": "task-123", 
  "message": "Implement the pattern we discussed in #memory://auth-patterns"
})
axiom_send({ "taskId": "task-123", "message": "\r" })
```

## Advanced Patterns

### Pattern: Continuous Development Session

```javascript
// Initial task
axiom_spawn({ "prompt": "Create user.model.js" })
// ... handle trust, send prompt ...

// Continue with related tasks (no new spawn needed)
axiom_send({ "taskId": "task-123", "message": "Now create user.controller.js" })
axiom_send({ "taskId": "task-123", "message": "\r" })

// Add tests
axiom_send({ "taskId": "task-123", "message": "Create user.test.js with Jest tests" })
axiom_send({ "taskId": "task-123", "message": "\r" })
```

### Pattern: Debugging Workflow

```javascript
// Start debugging session
axiom_spawn({ "prompt": "Debug authentication error" })
// ... handle trust ...

// Run test
axiom_send({ "taskId": "task-123", "message": "Run: npm test auth.test.js" })
axiom_send({ "taskId": "task-123", "message": "\r" })

// See error, ask for fix
axiom_send({ "taskId": "task-123", "message": "Fix the 'undefined token' error" })
axiom_send({ "taskId": "task-123", "message": "\r" })
```

### Pattern: Code Review Style

```javascript
// Review and improve
axiom_send({ 
  "taskId": "task-123", 
  "message": "Review #auth.js and add:\n- Input validation\n- Error handling\n- JSDoc comments"
})
axiom_send({ "taskId": "task-123", "message": "\r" })
```

## Keyboard Shortcuts Through Axiom

All Claude keyboard shortcuts work through axiom_send:

```javascript
// Vim navigation (after /vim)
axiom_send({ "taskId": "task-123", "message": "j" })  // Down
axiom_send({ "taskId": "task-123", "message": "k" })  // Up
axiom_send({ "taskId": "task-123", "message": "G" })  // End of file

// History navigation
axiom_send({ "taskId": "task-123", "message": "\x1b[A" })  // Up arrow
axiom_send({ "taskId": "task-123", "message": "\x1b[B" })  // Down arrow

// Cancel current input
axiom_send({ "taskId": "task-123", "message": "\x03" })  // Ctrl+C
```

## Monitoring Best Practices

### 1. Check Runtime
```javascript
axiom_status({ "taskId": "task-123" })
// Runtime > 0 = Claude is working
// Runtime not increasing = might be stuck
```

### 2. Tail Output
```javascript
axiom_output({ "taskId": "task-123", "tail": 50 })
// See last 50 lines
```

### 3. Watch for Patterns
- "File created:" - Success
- "Error:" - Problem to address
- Long planning text - Time to interrupt

## Common Issues and Solutions

### Issue: Claude Not Responding
```javascript
// Check status
axiom_status({ "taskId": "task-123" })

// If stuck, interrupt and retry
axiom_interrupt({ "taskId": "task-123", "followUp": "quit" })
```

### Issue: Wrong Language
```javascript
// Interrupt and redirect
axiom_interrupt({ 
  "taskId": "task-123", 
  "followUp": "[INTERRUPT: CHANGE TO PYTHON]"
})
```

### Issue: Too Much Planning
```javascript
// Force implementation
axiom_send({ 
  "taskId": "task-123", 
  "message": "[INTERRUPT: STOP PLANNING. CREATE THE FILE NOW.]"
})
```

## Exit Strategies

### Graceful Exit
```javascript
axiom_send({ "taskId": "task-123", "message": "/exit" })
axiom_send({ "taskId": "task-123", "message": "\r" })
```

### Force Quit
```javascript
axiom_interrupt({ "taskId": "task-123", "followUp": "quit" })
```

## Key Differences from Direct Claude Usage

1. **Two-Step Process**: Spawn validates, then you send real prompt
2. **Trust Dialog**: Always handle the trust confirmation first
3. **Explicit Submission**: Must send "\r" to submit prompts
4. **Async Monitoring**: Use status/output to track progress
5. **Intervention Power**: Can interrupt and redirect at any time

## Remember

- Axiom spawns real Claude instances
- All Claude features work normally
- You're sending keystrokes, not API calls
- Timing matters for interrupts
- Runtime is your success indicator