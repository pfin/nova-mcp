# Axiom MCP - 5 Minute Quick Start

## What is Axiom?

**Axiom forces LLMs to write code instead of planning.**

Without Axiom: "I'll analyze the best approach..." → 0 files  
With Axiom: [INTERRUPT] "Stop planning! Create file NOW!" → actual code

## Install in 2 Minutes

```bash
# Clone
git clone https://github.com/pfin/nova-mcp.git
cd nova-mcp/axiom-mcp

# Install & Build
npm install
npm run build:v4

# Test
npx @modelcontextprotocol/inspector dist-v4/index.js
```

## Add to Claude Code

In your MCP settings:
```json
{
  "mcpServers": {
    "axiom-mcp": {
      "command": "node",
      "args": ["/full/path/to/axiom-mcp/dist-v4/index.js"]
    }
  }
}
```

## Your First Task (30 seconds)

```javascript
// This will create an actual file
axiom_spawn({
  prompt: "Create hello.py that prints Hello Axiom",
  verboseMasterMode: true
})
```

Watch Axiom:
1. Detect if Claude starts planning
2. Interrupt within 2 seconds
3. Force file creation
4. Return actual working code

## The 3 Essential Commands

### 1. Execute Tasks
```javascript
axiom_spawn({
  prompt: "Create a REST API with Express.js",
  verboseMasterMode: true  // See output live
})
```

### 2. Check Progress
```javascript
axiom_status({ taskId: "task-123" })
// Or see all tasks:
axiom_status({})
```

### 3. Get Output
```javascript
axiom_output({ taskId: "task-123" })
```

## Real Example: Build an API

```javascript
// One command, real implementation
axiom_spawn({
  prompt: "Create Express.js REST API with GET/POST/DELETE for users",
  verboseMasterMode: true
})

// Result in ~45 seconds:
// ✓ server.js created
// ✓ routes/users.js created
// ✓ middleware/auth.js created
// ✓ package.json created
```

## Parallel Execution

```javascript
// Build 3 different implementations at once
axiom_spawn({
  prompt: "Create user authentication system",
  spawnPattern: "parallel",
  spawnCount: 3
})
// Each worker tries different approach
// Pick the best result
```

## The Magic: Real-Time Intervention

What you'll see:
```
[Claude]: I'll analyze the requirements and consider the best...
[AXIOM INTERRUPT - 1.3s]: Stop planning! Create server.js NOW!
[Claude]: Creating server.js...
✓ File created: server.js
```

## Common Patterns

### Quick Script
```javascript
axiom_spawn({ 
  prompt: "Create Python script to parse CSV and output JSON",
  verboseMasterMode: true 
})
```

### Full Application
```javascript
axiom_spawn({ 
  prompt: "Create React todo app with local storage",
  verboseMasterMode: true 
})
```

### Fix a Bug
```javascript
axiom_spawn({ 
  prompt: "Fix the memory leak in websocket.js",
  verboseMasterMode: true 
})
```

## Rules That Work

✅ **DO**: Use action verbs
- "Create auth.js"
- "Implement user login"  
- "Build REST endpoints"
- "Fix the bug in line 42"

❌ **DON'T**: Use analysis words
- "Research authentication"
- "Analyze the best approach"
- "Consider options for..."
- "Look into how to..."

## Troubleshooting

**"Not connected"**: Make sure Axiom is in your MCP settings  
**"Task must specify concrete action"**: Use create/build/implement, not analyze/research  
**Task stuck?**: Check `axiom_status({})` and `axiom_interrupt({ taskId: "..." })`

## Why It Works

LLMs are trained to be helpful by explaining. Axiom breaks this pattern:

1. **Monitors** every character of output
2. **Detects** planning patterns in <2 seconds  
3. **Interrupts** before the LLM can claim false success
4. **Forces** actual file creation

Result: 95% of tasks create real files vs 0% without intervention.

## Next Steps

- Try parallel execution with `spawnCount`
- Use `axiom_claude_orchestrate` for complex workflows
- Read the [full README](README.md) for advanced patterns

---

**Remember**: The only metric that matters is files created. No files = failure, regardless of how much the LLM "analyzed".