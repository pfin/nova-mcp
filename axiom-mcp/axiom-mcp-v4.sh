#!/bin/bash
# Wrapper script for Axiom MCP v4 with debugging

# Log startup
echo "[$(date)] Starting Axiom MCP v4 wrapper" >> /tmp/axiom-mcp-debug.log
echo "PWD: $(pwd)" >> /tmp/axiom-mcp-debug.log
echo "Script location: $0" >> /tmp/axiom-mcp-debug.log
echo "Arguments: $@" >> /tmp/axiom-mcp-debug.log

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Run the actual MCP server
exec node "$SCRIPT_DIR/dist-v4/index.js" "$@" 2>> /tmp/axiom-mcp-debug.log