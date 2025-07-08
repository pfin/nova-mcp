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

// 6. Monitor
axiom_status({ "taskId": "task-123" })  // Check runtime
axiom_output({ "taskId": "task-123", "tail": 50 })  // See output
```

## Key Points
- **Runtime > 0 = Working**
- **Trust dialog ALWAYS appears first**
- **Use "\r" to submit prompts**
- **Use "quit" not "exit" to stop**
- **axiom_spawn prompt is for validation only**

## Quick Commands
```javascript
// Stop Claude
axiom_interrupt({ "taskId": "task-123", "followUp": "quit" })

// Change language
axiom_interrupt({ "taskId": "task-123", "followUp": "[INTERRUPT: CHANGE TO PYTHON]" })

// Force action
axiom_send({ "taskId": "task-123", "message": "[INTERRUPT: STOP PLANNING. CREATE FILE NOW.]" })
```

## Read Full Guides!
This is just a quick reference. Read the full guides for complete understanding.