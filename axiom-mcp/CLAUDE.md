# CLAUDE.md - Axiom MCP v3 Development Guide

## Critical Context

This is the Axiom MCP v3 project - a parallel execution observatory that enforces real implementation over planning.

## Before/After: The Axiom MCP Transformation

### Before (Traditional AI Coding)
```
User: "Write a factorial function"
AI: "I would create a function that calculates factorial..."
Result: 
- No files created
- Just descriptions
- TODOs everywhere
- No verification possible
```

### After (Axiom MCP Execution)
```
User: "Write a factorial function"
Axiom MCP:
1. Spawns real process with PTY executor
2. Monitors output stream character-by-character
3. Detects file creation events
4. Verifies files exist on filesystem
5. Stores complete audit trail in SQLite
6. Enforces universal principles (no TODOs, no mocks)
```

## Key Components

### 1. Observability System
- **SQLite Database**: Tracks conversations, actions, streams
- **Stream Parser**: Extracts events from PTY output
- **Rule Verifier**: Enforces universal principles
- **Observation Tool**: View active conversations, trees, recent actions

### 2. Universal Principles
- **No Mocks Ever**: Real execution only
- **No TODOs**: Implement fully or not at all
- **Action Over Planning**: Write code, not descriptions
- **Verify Don't Trust**: Check every operation succeeded
- **Fail Fast and Loudly**: Clear errors immediately

### 3. Current Status (Jan 2025)
- ✅ PTY Executor connected
- ✅ Database and observability built
- ✅ Principles system implemented
- ❌ Claude CLI doesn't execute directly (bottleneck identified)
- 🔧 Need alternative execution method

## Development Workflow

1. **Always check observability first**:
   ```
   axiom_mcp_observe({ mode: "all" })
   axiom_mcp_observe({ mode: "recent", limit: 10 })
   ```

2. **Verify principles compliance**:
   ```
   axiom_mcp_principles({ action: "check", code: "..." })
   axiom_mcp_principles({ action: "verify", conversationId: "..." })
   ```

3. **Track execution attempts**:
   - Check if files were created
   - Review stream events for violations
   - Monitor parent-child task relationships

## Remember

The entire point of Axiom MCP is to force real implementation. If it doesn't create files, it's not working. The observability system shows us exactly what's happening - use it!

## Execution Plan (Current Priority)

### Step 1: Verify Baseline (NOW)
```bash
npm run build
# Check for errors
# Ensure all components compile
```

### Step 2: Test After Reload
1. Reload window to get new tools
2. Test `axiom_mcp_observe` tool
3. Test `axiom_mcp_principles` tool
4. Verify database creation

### Step 3: Fix Execution Bottleneck
Options to try:
1. **Direct File Writer**: Create executor that writes files directly
2. **Command Patterns**: Try `echo "content" > file.py` approach
3. **Script Generation**: Generate and execute bash scripts
4. **API Integration**: Skip CLI entirely

### Step 4: Verify Everything Works
- Run factorial test with new executor
- Check observability captures events
- Verify principles are enforced
- Confirm files are created

### Always Before Proceeding:
1. Build: `npm run build`
2. Check: No TypeScript errors
3. Test: Basic functionality works
4. Commit: Working state preserved