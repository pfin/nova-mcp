# Axiom MCP Quick Start for LLMs

## Essential Resources (Read These!)
```
axiom://integration-guide  - Complete usage guide
axiom://tools-guide       - All tools explained
axiom://claude-control-guide - Step-by-step control
```

## Basic Claude Control Flow
```javascript
// 1. Start
axiom_spawn({ "prompt": "Create file.py with function" })
// Get: { "taskId": "task-123" }

// 2. Trust (ALWAYS REQUIRED)
axiom_send({ "taskId": "task-123", "message": "1" })

// 3. Wait for "Welcome to Claude Code!"
axiom_output({ "taskId": "task-123", "tail": 20 })

// 4. Send actual prompt
axiom_send({ "taskId": "task-123", "message": "Create factorial.py" })

// 5. Submit (Ctrl+Enter)
axiom_send({ "taskId": "task-123", "message": "\r" })

// 6. Monitor for file approval prompts
axiom_output({ "taskId": "task-123", "tail": 50 })
// If you see "Do you want to create file.py?" send "1" (NOT "y"!)
axiom_send({ "taskId": "task-123", "message": "1" })  // Approve
// or
axiom_send({ "taskId": "task-123", "message": "2" })  // Auto-approve all
```

## Key Points
- **Runtime > 0 = Working**
- **Trust dialog ALWAYS appears first**
- **Use "\r" to submit prompts**
- **Use "quit" not "exit" to stop**
- **axiom_spawn prompt is for validation only**
- **CRITICAL: Send "1" or "2" for approvals, NOT "y"!**
- **File approval prompts block execution**
- **Auto-updates can interrupt tasks (wait 30s)**

## Quick Commands
```javascript
// Stop Claude
axiom_interrupt({ "taskId": "task-123", "followUp": "quit" })

// Change language
axiom_interrupt({ "taskId": "task-123", "followUp": "[INTERRUPT: CHANGE TO PYTHON]" })

// Force action
axiom_send({ "taskId": "task-123", "message": "[INTERRUPT: STOP PLANNING. CREATE FILE NOW.]" })
```

## Common Issues & Solutions

### Task Stuck on "Do you want to create...?"
```javascript
// WRONG - This won't work!
axiom_send({ "taskId": "task-123", "message": "y" })
axiom_send({ "taskId": "task-123", "message": "yes" })

// CORRECT - Send the menu number
axiom_send({ "taskId": "task-123", "message": "1" })  // Yes
axiom_send({ "taskId": "task-123", "message": "2" })  // Yes, auto-approve all
```

### Task Stuck on Research/Web Searches
```javascript
axiom_send({ 
  "taskId": "task-123", 
  "message": "Stop researching. Create files now with Write tool." 
})
```

### Claude Auto-Updating
- Wait 30+ seconds for update to complete
- May need to restart task after update
- Increase PTY startup delay to 5+ seconds

## 3x3x3 Pattern Quick Reference
```javascript
// Level 1: Decompose
axiom_spawn({
  "prompt": "Break into 3 orthogonal tasks...",
  "spawnPattern": "decompose",
  "spawnCount": 3,
  "verboseMasterMode": true
})

// Level 2: Verify (per task)
axiom_spawn({
  "prompt": "Verify sources with Puppeteer...",
  "spawnPattern": "parallel",
  "spawnCount": 3,
  "verboseMasterMode": true
})
```

## Read Full Guides!
This is just a quick reference. Read the full guides for complete understanding.