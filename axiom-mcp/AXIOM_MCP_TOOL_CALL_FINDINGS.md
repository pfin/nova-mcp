# Axiom MCP Tool Call Findings

Date: 2025-07-08

## Summary

After extensive testing, I've discovered that while the axiom-mcp-v4 server is running correctly, its tools are NOT accessible from Claude Code. This appears to be a configuration/registration issue.

## Key Findings

### 1. Server is Running
- Process confirmed: `npm exec /home/peter/nova-mcp/axiom-mcp/dist-v4/index.js`
- Server name: `axiom-mcp-v4`
- Server responds correctly to MCP protocol requests

### 2. Available Tools (from server)
The axiom-mcp server exposes these tools:
- `axiom_spawn` - Execute tasks with validation and monitoring
- `axiom_send` - Send input to running tasks
- `axiom_status` - Check task status
- `axiom_output` - Get task output
- `axiom_interrupt` - Stop/interrupt a running task
- `axiom_claude_orchestrate` - Control Claude instances with patterns
- `axiom_claude_orchestrate_proper` - Control Claude with git worktree
- `axiom_orthogonal_decompose` - Decompose complex tasks

### 3. Tool Call Attempts (all failed)
Tried these patterns:
- Direct: `axiom_spawn` ❌
- With MCP prefix: `mcp__axiom_spawn` ❌
- With server name: `mcp__axiom-mcp-v4__axiom_spawn` ❌

### 4. Other MCP Tools Work
These MCP tools are accessible:
- `mcp__nova-memory__*` ✅
- `mcp__github__*` ✅
- `mcp__postgres__*` ✅
- `mcp__brave_search__*` ✅
- `mcp__puppeteer__*` ✅
- `mcp__gemini__*` ✅
- `mcp__chatgpt__*` ✅

## Root Cause

The axiom-mcp server is not properly registered with Claude Code. While it's running as a process, Claude Code doesn't know about it or expose its tools.

## Solution Found!

The issue was that axiom-mcp wasn't registered in Claude Code's MCP configuration.

### Steps to Fix:

1. **Added to ~/.claude/settings.json**:
   ```json
   "axiom-mcp": {
     "command": "node",
     "args": ["/home/peter/nova-mcp/axiom-mcp/dist-v4/index.js"],
     "env": {
       "AXIOM_LOG_LEVEL": "INFO",
       "AXIOM_DB_PATH": "/home/peter/nova-mcp/axiom-mcp/axiom-v4.db"
     }
   }
   ```

2. **Restart Claude Code Required**
   - MCP servers are loaded at startup
   - Must restart Claude Code for changes to take effect

3. **Correct Tool Naming Pattern**
   - Format: `mcp__<server-name>__<tool-name>`
   - Example: `mcp__axiom-mcp__axiom_spawn`
   - The server name in settings.json determines the prefix

### Verification
After restart, these tools should be available:
- `mcp__axiom-mcp__axiom_spawn`
- `mcp__axiom-mcp__axiom_send`
- `mcp__axiom-mcp__axiom_status`
- `mcp__axiom-mcp__axiom_output`
- `mcp__axiom-mcp__axiom_interrupt`
- `mcp__axiom-mcp__axiom_claude_orchestrate`
- `mcp__axiom-mcp__axiom_claude_orchestrate_proper`
- `mcp__axiom-mcp__axiom_orthogonal_decompose`

## Test Script

Created `test-axiom-connection.js` which successfully connects to the axiom-mcp server and retrieves tool list, confirming the server works correctly in isolation.