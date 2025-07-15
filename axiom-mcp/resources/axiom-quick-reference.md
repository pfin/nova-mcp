# Axiom MCP Quick Reference

## Current Status
- **V4**: Production (Connected)
- **V5**: Archived (Lessons integrated into V4)

## Essential Commands

### Basic Task Execution
```javascript
axiom_spawn({
  prompt: "Create auth.py with login function",
  verboseMasterMode: true
})
```

### Parallel Execution
```javascript
axiom_spawn({
  prompt: "Create REST API with auth, db, and tests",
  spawnPattern: "parallel",
  spawnCount: 3,
  verboseMasterMode: true
})
```

### Check Status
```javascript
axiom_status({ taskId: "task-123" })  // Single task
axiom_status({})                       // All tasks
```

### Get Output
```javascript
axiom_output({ taskId: "task-123" })
axiom_output({ taskId: "task-123", tail: 50 })  // Last 50 lines
```

### Claude Orchestration
```javascript
// Spawn
axiom_claude_orchestrate({ 
  action: "spawn", 
  instanceId: "backend" 
})

// Prompt
axiom_claude_orchestrate({ 
  action: "prompt", 
  instanceId: "backend",
  prompt: "Create Express API"
})

// Steer (mid-execution)
axiom_claude_orchestrate({ 
  action: "steer", 
  instanceId: "backend",
  prompt: "Add JWT auth"
})
```

## Key Patterns Detected

These patterns trigger intervention:
- "I'll analyze..." → Stop planning!
- "I would..." → Don't describe, DO!
- "Let me think..." → Write code NOW!
- "First, we need..." → Skip theory!
- "The best approach..." → Just build!

## Success Metrics

✅ Files created on disk
✅ Code that runs
✅ Tests that pass

❌ Descriptions
❌ Plans without code
❌ "I would implement..."

## Troubleshooting

### "DEBUGGING: Task would execute..."
PTY is in debug mode. Fix: Edit pty-executor.ts, remove debug return, rebuild

### Task not creating files?
Check with: `axiom_status({ taskId: "..." })`
Force action: `axiom_interrupt({ taskId: "...", followUp: "Create the file NOW!" })`

### MCP Tools not found?
Ensure server is in MCP settings:
```json
{
  "axiom-mcp-v4": {
    "command": "node",
    "args": ["/home/peter/nova-mcp/axiom-mcp/dist-v4/index.js"]
  }
}
```

## The Rules

1. **Files or Failure** - No files = task failed
2. **30-Second Window** - Intervene before false success
3. **Character Monitoring** - Every byte tracked
4. **Action Verbs Only** - "Create", "Build", "Fix", not "Research"
5. **Auto-Approve Files** - Say yes to creation prompts

## Philosophy

**V4**: "Trust but verify with extreme prejudice"
**V5**: "Never trust, always force" (archived)
**Unified**: "Monitor intelligently, intervene aggressively"