# Axiom MCP Configuration for Claude Code

## Quick Setup

### 1. Add to MCP Settings

Add these server configurations to your Claude Code MCP settings:

```json
{
  "axiom-mcp-v4": {
    "command": "node",
    "args": ["/home/peter/nova-mcp/axiom-mcp/dist-v4/index.js"],
    "description": "Axiom MCP V4 - Task decomposition and parallel execution"
  },
  "axiom-mcp-v5-shadow": {
    "command": "node", 
    "args": ["/home/peter/nova-mcp/axiom-mcp/dist-v5/src-v5/index-server.js"],
    "description": "Axiom MCP V5 Shadow Protocol - Thought decomposition"
  }
}
```

### 2. Build the Servers

```bash
cd /home/peter/nova-mcp/axiom-mcp
npm install
npm run build:v4
npm run build:v5
```

### 3. Test with MCP Inspector

#### Test V4:
```bash
npx @modelcontextprotocol/inspector dist-v4/index.js
```

#### Test V5:
```bash
npx @modelcontextprotocol/inspector dist-v5/src-v5/index-server.js
```

## Available Tools

### V4 Tools (6 tools)
- `axiom_spawn` - Execute tasks with monitoring
- `axiom_send` - Send input to running tasks
- `axiom_status` - Check task status
- `axiom_output` - Get task output
- `axiom_interrupt` - Interrupt running tasks
- `axiom_claude_orchestrate` - Control Claude instances

### V5 Tools (3 tools)
- `axiom_v5_execute` - Phased cognitive decomposition
- `axiom_v5_monitor` - Watch and kill weak instances
- `axiom_v5_glitch` - Introduce controlled chaos

## Example Tool Calls

### V4 - Basic Task Execution
```json
axiom_spawn({
  "prompt": "Create a Python web scraper",
  "verboseMasterMode": true
})
```

### V4 - Parallel Execution
```json
axiom_spawn({
  "prompt": "Build a REST API",
  "spawnPattern": "parallel",
  "spawnCount": 3,
  "verboseMasterMode": true
})
```

### V5 - Shadow Protocol
```json
axiom_v5_execute({
  "prompt": "Build distributed cache",
  "mode": "full",
  "aggressiveness": 0.8,
  "parallelism": 5
})
```

## Verification

1. **Check tools are available**: Look for axiom_* tools in Claude Code
2. **Test basic spawn**: Try creating a simple file
3. **Monitor execution**: Use status/monitor tools
4. **Check file creation**: Verify actual files are created

## Philosophy

- **V4**: Decompose tasks, execute in parallel, intervene on failure
- **V5**: Control HOW Claude thinks through tool starvation and phase control

Both versions enforce:
- Real implementation over planning
- File creation as success metric
- Interrupt-driven correction
- No false positive completions