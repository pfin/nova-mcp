# Axiom MCP v4 - Improvements Based on User Testing

## Critical Issues Found During Testing

### 1. Trust Prompt Blocking (CRITICAL)
**Problem:** Claude spawns with a trust prompt that blocks execution
**User Experience:** Tasks get stuck waiting for trust confirmation
**Solution Needed:** 
- Auto-accept trust for known directories
- Or provide clear instructions on handling this
- Or use `--no-trust-prompt` flag if available

### 2. Tool Parameter Validation
**Problem:** When I try to use axiom_send without parameters, it fails silently
**User Experience:** Confusing error: "Task undefined is not running"
**Solution:** Better parameter validation with helpful error messages

## Proposed Improvements

### 1. Enhanced Error Messages
```typescript
// Current
"Task undefined is not running or not found"

// Improved
"Error: Missing required parameter 'taskId'. Usage: axiom_send({ taskId: 'task-123', message: 'your message' })"
```

### 2. Trust Prompt Handler
Add to axiom_spawn response:
```json
{
  "taskId": "task-123",
  "status": "executing",
  "warning": "Claude may show trust prompt. Use axiom_send with '1\\n' to accept.",
  "trustPromptDetected": true
}
```

### 3. Quick Actions Tool
New tool suggestion: `axiom_quick`
```typescript
axiom_quick({
  "action": "create-file",
  "filename": "test.py",
  "content": "print('hello')"
})
// Bypasses Claude entirely for simple file operations
```

### 4. Task Templates
Add common templates to reduce verbosity:
```typescript
axiom_spawn({
  "template": "create-python-class",
  "className": "Calculator",
  "methods": ["add", "subtract", "multiply", "divide"]
})
```

### 5. Status Improvements
Current status is hard to read with multiple tasks:
```
// Current
[task-1751967530499] RUNNING - create a file hello_axiom.py w... (97923ms)
[task-1751967598535] RUNNING - create demo-calculator.py with... (29905ms)

// Improved
┌─────────────────────┬─────────┬──────────────────────────────┬──────────┐
│ Task ID             │ Status  │ Description                  │ Runtime  │
├─────────────────────┼─────────┼──────────────────────────────┼──────────┤
│ task-1751967530499  │ RUNNING │ create hello_axiom.py        │ 1m 38s   │
│ task-1751967598535  │ RUNNING │ create demo-calculator.py    │ 30s      │
└─────────────────────┴─────────┴──────────────────────────────┴──────────┘
```

### 6. Auto-Recovery from Common Issues
```typescript
// Detect trust prompt in output
if (output.includes("Do you trust the files")) {
  // Auto-send "1\n" or notify user
  automaticTrustResponse(taskId);
}
```

### 7. Better Resource Guide
The axiom://tools-guide is great but needs:
- Troubleshooting section for trust prompt
- Common patterns that work
- Examples of what triggers validation errors

### 8. Task History
```typescript
axiom_history({
  "limit": 10,
  "filter": "completed"
})
// Shows recent tasks with their outputs
```

### 9. Batch File Creation
For multiple files, avoid multiple Claude spawns:
```typescript
axiom_batch_create({
  "files": [
    { "path": "src/main.py", "content": "..." },
    { "path": "src/utils.py", "content": "..." },
    { "path": "tests/test_main.py", "content": "..." }
  ]
})
```

### 10. Debug Mode
```typescript
axiom_spawn({
  "prompt": "create test.py",
  "debug": true  // Shows all hooks firing, validation steps, etc.
})
```

## Implementation Priority

1. **Fix trust prompt issue** - This blocks everything
2. **Better error messages** - Reduces user frustration  
3. **Task templates** - Makes common operations easier
4. **Improved status display** - Better UX for multiple tasks
5. **Batch operations** - Efficiency improvement

## User Stories Addressed

**"As a user, I want to..."**
- ✅ Create files without dealing with trust prompts
- ✅ Understand why my commands fail
- ✅ See all my running tasks clearly
- ✅ Create multiple files efficiently
- ✅ Use common patterns without typing long prompts
- ✅ Debug when things go wrong

## Testing Checklist

- [ ] Can create a simple file without trust prompt blocking
- [ ] Error messages guide me to correct usage
- [ ] Status display is readable with 5+ tasks
- [ ] Templates work for common languages
- [ ] Batch creation is faster than individual spawns
- [ ] Debug mode shows useful information

## Summary

The core concept of Axiom MCP v4 is excellent - enforcing concrete actions and enabling parallel execution. However, the trust prompt issue and unclear error messages create friction for new users. Fixing these would make it a 5-star tool.