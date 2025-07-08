# Fix for Axiom MCP "Connection closed" Error

## The Problem
Axiom MCP v4 was trying to create its database in the current working directory (`process.cwd()`), which could be anywhere the MCP server was invoked from. This caused permission errors and immediate crashes.

## The Solution
We fixed this by using an environment variable `AXIOM_DB_PATH` to specify where the database should be created.

## Steps to Fix

### 1. Remove old configuration
```bash
claude mcp remove axiom-mcp
```

### 2. Add new configuration with database path
```bash
claude mcp add stdio axiom-mcp node /home/peter/nova-mcp/axiom-mcp/dist-v4/index.js --env AXIOM_DB_PATH=/home/peter/nova-mcp/axiom-mcp/axiom-v4.db
```

### 3. Restart Claude Code or refresh MCP connections
The MCP client caches connections. You may need to:
- Exit and restart Claude Code terminal
- Or wait a few seconds for the connection to refresh

### 4. Verify tools are available
After refresh, these tools should be available:
- `axiom_spawn` - Execute tasks with validation
- `axiom_send` - Send input to running tasks
- `axiom_status` - Check task status
- `axiom_output` - Get task output
- `axiom_interrupt` - Interrupt running tasks
- `axiom_claude_orchestrate` - Control Claude instances

## Using Axiom MCP for QuantLib

Once working, you can use:

```typescript
axiom_spawn({
  "prompt": "Create USD SABR volatility grid implementation with: 1) usd_sabr_model.py - SABR model, 2) market_data.py - vol quotes, 3) calibration.py - optimization, 4) surface_builder.py - interpolation, 5) visualization.py - plots",
  "verboseMasterMode": true
})
```

## What Changed

1. **Database Path**: Changed from `process.cwd()` to use `AXIOM_DB_PATH` environment variable
2. **Fallback**: If no env var set, uses `~/.axiom-mcp/axiom-v4.db`
3. **Build**: Recompiled with `npm run build:v4`

The server is now starting successfully (no immediate crash), so the database issue is fixed.