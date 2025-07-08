# Axiom MCP v4 Setup Instructions

## Why Axiom MCP Isn't Showing in Your Tools

Axiom MCP needs to be configured in your MCP client settings. Here's how to set it up:

## Step 1: Configure Your MCP Client

Add this to your MCP client configuration:

```json
{
  "mcpServers": {
    "axiom-mcp-v4": {
      "command": "node",
      "args": ["/home/peter/nova-mcp/axiom-mcp/dist-v4/index.js"],
      "env": {
        "AXIOM_LOG_LEVEL": "INFO"
      }
    }
  }
}
```

## Step 2: Restart Your MCP Client

After adding the configuration, you need to restart your MCP client for it to pick up the new MCP server.

## Step 3: Verify Tools Are Available

After restart, you should see these tools:
- `axiom_spawn` - Execute tasks with validation
- `axiom_send` - Send input to running tasks
- `axiom_status` - Check task status
- `axiom_output` - Get task output
- `axiom_interrupt` - Interrupt running tasks
- `axiom_claude_orchestrate` - Control Claude instances

## Alternative: Direct Testing

If you want to test Axiom MCP directly:

```bash
# Terminal 1: Start the MCP server
cd /home/peter/nova-mcp/axiom-mcp
node dist-v4/index.js

# Terminal 2: Test with inspector
npx @modelcontextprotocol/inspector
# Connect to: stdio://node /home/peter/nova-mcp/axiom-mcp/dist-v4/index.js
```

## Known Issues

### Trust Prompt Issue
Currently, Claude spawns with a trust prompt that blocks execution. This is being tracked in issue #1.

### Workaround for Trust Prompt
Until fixed, you can:
1. Use axiom_spawn for non-Claude tasks
2. Use the parallel execution features
3. Monitor task output in real-time

## Example Usage (Once Configured)

```typescript
// Execute a QuantLib task
axiom_spawn({
  "prompt": "Create quantlib_usd_grid.py with USD volatility grid implementation using SABR model",
  "verboseMasterMode": true
})

// Check status
axiom_status({})

// Get output
axiom_output({
  "taskId": "YOUR_TASK_ID"
})
```

## Building the USD Volatility Grid

Once Axiom MCP is available, you can use it like this:

```typescript
axiom_spawn({
  "prompt": "Create a complete USD volatility grid implementation with these files: 1) usd_sabr_calibration.py - SABR model calibration for USD swaptions, 2) market_data_loader.py - Load Bloomberg/Reuters vol quotes, 3) grid_builder.py - Build the full volatility surface, 4) calibration_report.py - Generate calibration statistics. Use QuantLib-Python with numpy and pandas.",
  "verboseMasterMode": true,
  "spawnPattern": "single"
})
```

This will actually create the files, not just plan them!