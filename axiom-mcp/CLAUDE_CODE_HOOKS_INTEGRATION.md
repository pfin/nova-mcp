# Claude Code Hooks Integration with Axiom MCP

## Overview

Axiom MCP v4 has two types of hooks that work together:
1. **Internal Axiom Hooks** - Built into the MCP server for task orchestration
2. **Claude Code Hooks** - User-configured shell commands that intercept tool calls

## Internal Axiom Hooks (Built-in)

These are already part of Axiom MCP v4:
- `validation-hook` - Ensures concrete deliverables
- `verbose-monitor-hook` - Real-time output monitoring
- `intervention-hook` - Interrupts bad patterns
- `parallel-execution-hook` - Manages parallel tasks
- `task-decomposition-hook` - Breaks down complex tasks

## Claude Code Hooks (User Configuration)

Users can enhance Axiom MCP by adding hooks to their Claude Code settings:

### Example: Log All Axiom Tasks
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "axiom_spawn",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"[$(date)] Starting Axiom task: $(jq -r '.tool_input.prompt' | head -c 50)...\" >> ~/.axiom-tasks.log"
          }
        ]
      }
    ]
  }
}
```

### Example: Block TODO-Only Tasks
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "axiom_spawn",
        "hooks": [
          {
            "type": "command",
            "command": "axiom-mcp/hooks/check-for-todos.sh"
          }
        ]
      }
    ]
  }
}
```

Where `check-for-todos.sh` could be:
```bash
#!/bin/bash
# Check if output contains only TODOs without implementation
output=$(jq -r '.tool_output.content[0].text' 2>/dev/null)
if echo "$output" | grep -q "TODO" && ! echo "$output" | grep -q "File created"; then
  echo '{"continue": false, "reason": "Task produced only TODOs without implementation"}'
  exit 2
fi
exit 0
```

### Example: Parallel Task Monitoring
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "axiom_spawn",
        "hooks": [
          {
            "type": "command",
            "command": "axiom-mcp/hooks/monitor-parallel.sh"
          }
        ]
      }
    ]
  }
}
```

### Example: Claude Orchestration Tracking
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "axiom_claude_orchestrate",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '\"[Claude Orchestrate] \\(.tool_input.action) on \\(.tool_input.instanceId)\"' >> ~/.claude-orchestration.log"
          }
        ]
      }
    ]
  }
}
```

## Best Practices for Hook Integration

1. **Logging**: Use hooks to create audit trails of all Axiom operations
2. **Validation**: Add hooks that verify code was actually written
3. **Security**: Block dangerous operations before they execute
4. **Monitoring**: Track resource usage across parallel executions
5. **Integration**: Connect Axiom to external systems via hooks

## Hook Execution Flow

```
User Request → Claude Code → PreToolUse Hook → Axiom MCP Tool → Internal Axiom Hooks → Execution → PostToolUse Hook → Response
```

## Advanced: Bi-directional Communication

Hooks can write to files that Axiom monitors:
```bash
# In a hook
echo '{"interrupt": "STOP", "reason": "Detected infinite loop"}' > /tmp/axiom-interrupt.json

# Axiom could monitor this file and react to interrupts
```

## Security Considerations

- Hooks run with full user permissions
- Always validate inputs in hook scripts
- Use absolute paths to avoid ambiguity
- Be cautious with file operations
- Test hooks thoroughly before use

## Example Complete Setup

1. Create hooks directory:
```bash
mkdir -p ~/axiom-mcp/hooks
chmod +x ~/axiom-mcp/hooks/*.sh
```

2. Add to Claude Code settings:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "axiom_*",
        "hooks": [
          {
            "type": "command",
            "command": "~/axiom-mcp/hooks/pre-axiom.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "axiom_*",
        "hooks": [
          {
            "type": "command",
            "command": "~/axiom-mcp/hooks/post-axiom.sh"
          }
        ]
      }
    ]
  }
}
```

3. Create hook scripts that enhance Axiom's behavior

This integration allows users to extend Axiom MCP's capabilities while maintaining the core interrupt-driven execution philosophy.