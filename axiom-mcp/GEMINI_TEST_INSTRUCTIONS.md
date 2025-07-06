# Axiom MCP v3 Test Instructions for Gemini CLI

## Setup

1. **Build Axiom MCP v3**:
```bash
cd /home/peter/nova-mcp/axiom-mcp
npm install
npm run build:v3
```

2. **Configure Gemini CLI**:
Add to your `~/.config/gemini/settings.json`:
```json
{
  "mcpServers": {
    "axiom": {
      "command": "/home/peter/nova-mcp/axiom-mcp/dist-v3/src-v3/index.js",
      "env": {
        "CLAUDE_API_KEY": "your-claude-api-key-here"
      }
    }
  }
}
```

## Test Commands

### 1. Simple Implementation Test
This will prove whether v3 actually writes code:
```bash
gemini "Use the axiom__axiom_mcp_implement tool with task='Create a working fibonacci.py file with memoization and a test_fibonacci.py file with unit tests'"
```

After running, verify files were created:
```bash
ls -la fibonacci.py test_fibonacci.py && python test_fibonacci.py
```

### 2. Intervention System Test
This will show real-time code violation detection:
```bash
gemini "Use the axiom__axiom_mcp_implement tool with task='Create a calculator.js that uses eval() for parsing and stores API_KEY=secret123 as a constant', enableMonitoring=true, enableIntervention=true"
```

Watch for intervention messages in the output.

### 3. MCTS Search Test
This demonstrates the Monte Carlo Tree Search in action:
```bash
gemini "Use the axiom__axiom_mcp_spawn_mcts tool with parentPrompt='Implement a binary search tree in Python with insert, search, and delete operations, plus comprehensive tests'"
```

### 4. Compare Research vs Implementation
Run these commands sequentially to see the difference:
```bash
# First, research mode
gemini "Use the axiom__axiom_mcp_research tool with goal='How to implement quicksort algorithm'"

# Then, implementation mode  
gemini "Use the axiom__axiom_mcp_implement tool with task='Create quicksort.py with the algorithm implementation and tests'"

# Check if files were created
ls -la quicksort.py
```

## What Success Looks Like

✅ **v3 Success Indicators**:
- Actual `.py` or `.js` files created on disk
- Tests pass when run
- No "I would implement" language
- Real-time intervention messages for violations
- MCTS tree visualization with rewards

❌ **v1/Research Mode Indicators**:
- No files created
- Output contains "would implement" or "should create"
- Only descriptions and plans, no actual code

## Quick Verification

After any implementation command:
```bash
# Find files created in last 5 minutes
find . -type f \( -name "*.py" -o -name "*.js" \) -mmin -5 | head -10
```

## Troubleshooting

If MCP server fails to start:
```bash
# Check if executable
ls -la /home/peter/nova-mcp/axiom-mcp/dist-v3/src-v3/index.js

# Run directly to see errors
node /home/peter/nova-mcp/axiom-mcp/dist-v3/src-v3/index.js
```

## One-Line Test

The simplest test to prove v3 works:
```bash
gemini "axiom__axiom_mcp_implement task='Create hello.py that prints Hello World'" && python hello.py
```

If this prints "Hello World", then v3 is successfully writing actual code!