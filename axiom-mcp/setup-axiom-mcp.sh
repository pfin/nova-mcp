#!/bin/bash
# Setup script for Axiom MCP v4

echo "Axiom MCP v4 Setup Script"
echo "========================"
echo ""

# Step 1: Build the project
echo "Step 1: Building Axiom MCP v4..."
cd /home/peter/nova-mcp/axiom-mcp
npm run build:v4

# Step 2: Show configuration needed
echo ""
echo "Step 2: Add this to your Claude Desktop config:"
echo "Location: ~/.config/claude/desktop/config.json"
echo ""
cat << 'EOF'
{
  "mcpServers": {
    "axiom-mcp-v4": {
      "command": "node",
      "args": ["/home/peter/nova-mcp/axiom-mcp/dist-v4/index.js"],
      "env": {
        "AXIOM_LOG_LEVEL": "INFO",
        "AXIOM_ALLOW_DANGEROUS": "true"
      }
    }
  }
}
EOF

echo ""
echo "Step 3: Restart Claude Desktop after adding the configuration"
echo ""

# Step 4: Test the server
echo "Step 4: Testing Axiom MCP server..."
echo "Starting server (Ctrl+C to stop)..."
echo ""

# Show what tools will be available
echo "Once configured, you'll have access to these tools:"
echo "- axiom_spawn: Execute tasks with validation and monitoring"
echo "- axiom_send: Send input to running tasks"
echo "- axiom_status: Check task status"
echo "- axiom_output: Get task output"
echo "- axiom_interrupt: Interrupt running tasks"
echo "- axiom_claude_orchestrate: Control multiple Claude instances"
echo ""

echo "Example usage for your QuantLib task:"
echo 'axiom_spawn({'
echo '  "prompt": "Create USD SABR volatility grid calibration: 1) usd_sabr_model.py with SABR implementation, 2) market_data.py with vol quotes, 3) calibration.py with optimization, 4) visualization.py with surface plots",'
echo '  "verboseMasterMode": true'
echo '})'
echo ""

# Optionally start the server for testing
read -p "Do you want to test the server now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Starting Axiom MCP server..."
    echo "In another terminal, run: npx @modelcontextprotocol/inspector"
    echo "Then connect to: stdio://node /home/peter/nova-mcp/axiom-mcp/dist-v4/index.js"
    echo ""
    node /home/peter/nova-mcp/axiom-mcp/dist-v4/index.js
fi