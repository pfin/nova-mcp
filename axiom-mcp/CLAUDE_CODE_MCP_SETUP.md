# Setting up Axiom MCP in Claude Code

## Quick Setup

Run this command in Claude Code to add Axiom MCP:

```bash
# Add with environment variable for database path
claude mcp add stdio axiom-mcp-v4 node /home/peter/nova-mcp/axiom-mcp/dist-v4/index.js --env AXIOM_DB_PATH=/home/peter/nova-mcp/axiom-mcp/axiom-v4.db
```

## Verify Installation

After adding, check that the tools are available:

```bash
# List configured MCP servers
claude mcp list

# The following tools should be available:
# - axiom_spawn
# - axiom_send  
# - axiom_status
# - axiom_output
# - axiom_interrupt
# - axiom_claude_orchestrate
```

## Using Axiom MCP for QuantLib Task

Once configured, you can use the tools directly:

```typescript
axiom_spawn({
  "prompt": "Create USD SABR volatility grid implementation with these files: 1) usd_sabr_model.py with SABR model for USD swaptions, 2) market_data.py with Bloomberg vol quotes, 3) calibration.py with QuantLib optimization, 4) surface_builder.py with interpolation, 5) visualization.py with matplotlib plots",
  "verboseMasterMode": true
})
```

## Troubleshooting

If tools aren't available:
1. Check server is running: `claude mcp list`
2. Remove and re-add: `claude mcp remove axiom-mcp-v4`
3. Check logs: Look in logs-v4 directory

## Direct Testing (Without MCP)

```bash
cd /home/peter/nova-mcp/axiom-mcp
npx @modelcontextprotocol/inspector ./dist-v4/index.js
```