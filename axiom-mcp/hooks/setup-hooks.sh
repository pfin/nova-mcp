#!/bin/bash
# Setup script for Axiom MCP hooks
# Installs hooks into Claude Code configuration

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${CYAN}         Axiom MCP Hooks Setup${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

# Check if running from correct directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
AXIOM_ROOT="$(dirname "$SCRIPT_DIR")"

if [ ! -f "$AXIOM_ROOT/package.json" ]; then
    echo -e "${RED}Error: Must run from axiom-mcp/hooks directory${RESET}"
    exit 1
fi

echo -e "${GREEN}✓${RESET} Found Axiom MCP at: $AXIOM_ROOT"

# Create necessary directories
echo -e "\n${YELLOW}Creating directories...${RESET}"
mkdir -p "$AXIOM_ROOT/logs-v3"
mkdir -p "$HOME/.claude_code"

# Make all hook scripts executable
echo -e "\n${YELLOW}Making hooks executable...${RESET}"
chmod +x "$SCRIPT_DIR"/*.sh
echo -e "${GREEN}✓${RESET} Hook scripts are now executable"

# Check for Claude Code hooks configuration
CLAUDE_HOOKS="$HOME/.claude_code/hooks.json"

if [ -f "$CLAUDE_HOOKS" ]; then
    echo -e "\n${YELLOW}Existing hooks.json found${RESET}"
    echo "Would you like to:"
    echo "1) Backup existing and install Axiom hooks"
    echo "2) Merge Axiom hooks with existing (advanced)"
    echo "3) Skip hooks.json installation"
    read -p "Choice (1-3): " choice
    
    case $choice in
        1)
            cp "$CLAUDE_HOOKS" "$CLAUDE_HOOKS.backup.$(date +%Y%m%d_%H%M%S)"
            echo -e "${GREEN}✓${RESET} Backup created"
            cp "$SCRIPT_DIR/hooks.json" "$CLAUDE_HOOKS"
            echo -e "${GREEN}✓${RESET} Axiom hooks installed"
            ;;
        2)
            echo -e "${YELLOW}Manual merge required. Please edit: $CLAUDE_HOOKS${RESET}"
            echo "Reference: $SCRIPT_DIR/hooks.json"
            ;;
        3)
            echo -e "${YELLOW}Skipping hooks.json installation${RESET}"
            ;;
    esac
else
    cp "$SCRIPT_DIR/hooks.json" "$CLAUDE_HOOKS"
    echo -e "${GREEN}✓${RESET} Hooks configuration installed to: $CLAUDE_HOOKS"
fi

# Create symlinks for easier access (optional)
echo -e "\n${YELLOW}Creating command shortcuts...${RESET}"
INSTALL_DIR="/usr/local/bin"

if [ -w "$INSTALL_DIR" ]; then
    for hook in "$SCRIPT_DIR"/axiom-*.sh; do
        name=$(basename "$hook" .sh)
        if ln -sf "$hook" "$INSTALL_DIR/$name" 2>/dev/null; then
            echo -e "${GREEN}✓${RESET} Linked: $name"
        fi
    done
else
    echo -e "${YELLOW}Note: Cannot create global shortcuts (need sudo)${RESET}"
    echo "Hooks will still work from: $SCRIPT_DIR"
fi

# Test hook execution
echo -e "\n${YELLOW}Testing hooks...${RESET}"

# Test validation hook
if TOOL_NAME="test" TOOL_ARGS='{"prompt":"test"}' "$SCRIPT_DIR/axiom-validate-concrete.sh" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${RESET} Validation hook works"
else
    echo -e "${RED}✗${RESET} Validation hook failed"
fi

# Create initial log files
touch "$AXIOM_ROOT/logs-v3/hooks.log"
touch "$AXIOM_ROOT/logs-v3/interventions.log"
touch "$AXIOM_ROOT/logs-v3/verification.log"
echo '{"total":0,"passed":0,"failed":0}' > "$AXIOM_ROOT/logs-v3/verification-stats.json"

echo -e "${GREEN}✓${RESET} Log files initialized"

# Display summary
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}✅ Axiom MCP Hooks Installation Complete!${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

echo -e "\n${YELLOW}Installed Hooks:${RESET}"
echo "• axiom-validate-concrete - Ensures concrete deliverables"
echo "• axiom-stream-monitor - Real-time output observation"
echo "• axiom-intervene - Pattern-based interventions"
echo "• axiom-verify-implementation - Post-execution verification"

echo -e "\n${YELLOW}Configuration:${RESET}"
echo "• Hooks config: $CLAUDE_HOOKS"
echo "• Logs directory: $AXIOM_ROOT/logs-v3/"
echo "• Scripts: $SCRIPT_DIR/"

echo -e "\n${YELLOW}Next Steps:${RESET}"
echo "1. Restart Claude Code to load hooks"
echo "2. Test with: axiom_mcp_spawn"
echo "3. Monitor logs: tail -f $AXIOM_ROOT/logs-v3/*.log"

echo -e "\n${GREEN}Ready to enforce implementation over planning!${RESET}\n"

# Optional: Test with a simple spawn
read -p "Would you like to test the hooks now? (y/n): " test_now

if [[ "$test_now" =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}Testing axiom_mcp_spawn with concrete task...${RESET}"
    
    # Create a test script that simulates a tool call
    cat > /tmp/test-axiom-hooks.sh << 'EOF'
#!/bin/bash
export TOOL_NAME="axiom_mcp_spawn"
export TOOL_ARGS='{"parentPrompt":"Create test.ts with a hello world function","spawnPattern":"sequential"}'

echo "Testing validation..."
/home/peter/nova-mcp/axiom-mcp/hooks/axiom-validate-concrete.sh

echo -e "\nTesting stream monitor..."
/home/peter/nova-mcp/axiom-mcp/hooks/axiom-stream-monitor.sh &
MONITOR_PID=$!
sleep 2
kill $MONITOR_PID 2>/dev/null

echo -e "\nHooks are working!"
EOF
    
    chmod +x /tmp/test-axiom-hooks.sh
    /tmp/test-axiom-hooks.sh
    rm /tmp/test-axiom-hooks.sh
fi

echo -e "\n${CYAN}Installation complete!${RESET}"