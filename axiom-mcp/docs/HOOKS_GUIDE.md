# Claude Code Hooks Integration Guide for Axiom MCP

## Overview

Claude Code hooks are user-defined shell commands that execute at specific points during Claude Code's execution lifecycle. For Axiom MCP, hooks provide powerful opportunities to enforce our principles of parallel execution, real-time observation, and intelligent intervention.

## Hook Events

### 1. PreToolUse
Executes before any tool is called. For Axiom MCP, this is crucial for:
- Validating tool inputs before execution
- Enforcing "No TODO" rules
- Logging all tool attempts for observability
- Blocking potentially harmful operations

### 2. PostToolUse
Executes after a tool completes. Use cases:
- Verify files were actually created (not just planned)
- Check for code violations
- Trigger automatic formatting
- Update task status in ConversationDB

### 3. Notification
Triggered when Claude is waiting for input. Perfect for:
- Alerting when human intervention is needed
- Displaying current task progress
- Showing verbose mode output in real-time

### 4. Stop
Runs when the main agent finishes. Essential for:
- Final verification of implementation
- Generating execution reports
- Cleaning up temporary resources
- Committing successful changes

### 5. SubagentStop
Runs when a subagent completes. Enables:
- Tracking parallel execution paths
- Aggregating results from multiple approaches
- Identifying the most successful implementation

## Axiom MCP Hook Configuration Examples

### 1. Enforce Implementation Over Planning

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "axiom_mcp_spawn",
        "hooks": [
          {
            "type": "command",
            "command": "axiom-verify-no-todos"
          }
        ]
      }
    ]
  }
}
```

Create `axiom-verify-no-todos` script:
```bash
#!/bin/bash
# Check if the prompt contains TODO or planning keywords
if echo "$TOOL_ARGS" | grep -iE "(todo|plan|think|consider|might|should)" > /dev/null; then
  echo '{"continue": false, "reason": "Prompt contains planning keywords. Force implementation!"}'
  exit 2
fi
exit 0
```

### 2. Real-time Verbose Mode Monitoring

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "axiom_mcp_spawn",
        "hooks": [
          {
            "type": "command",
            "command": "axiom-stream-monitor"
          }
        ]
      }
    ]
  }
}
```

Create `axiom-stream-monitor` script:
```bash
#!/bin/bash
# Tail the latest log file and display with colors
LOG_FILE=$(ls -t logs-v3/axiom-events-*.jsonl | head -1)
if [ -n "$LOG_FILE" ]; then
  tail -f "$LOG_FILE" | jq -r '.payload.output // empty' | grep -v '^$'
fi &
```

### 3. Automatic Code Formatting

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "axiom-format-code"
          }
        ]
      }
    ]
  }
}
```

Create `axiom-format-code` script:
```bash
#!/bin/bash
# Auto-format based on file extension
FILE_PATH=$(echo "$TOOL_RESULT" | jq -r '.file_path // empty')
if [ -n "$FILE_PATH" ]; then
  case "$FILE_PATH" in
    *.ts|*.tsx) npx prettier --write "$FILE_PATH" ;;
    *.py) black "$FILE_PATH" ;;
    *.rs) rustfmt "$FILE_PATH" ;;
  esac
fi
exit 0
```

### 4. Violation Detection and Intervention

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "axiom-detect-violations"
          }
        ]
      }
    ]
  }
}
```

Create `axiom-detect-violations` script:
```bash
#!/bin/bash
# Check for common violations
VIOLATIONS=""

# Check for console.log in production code
if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ]; then
  if echo "$TOOL_RESULT" | grep -E "console\.(log|error|warn)" > /dev/null; then
    VIOLATIONS="$VIOLATIONS\n- Console statements detected in production code"
  fi
fi

# Check for missing error handling
if echo "$TOOL_RESULT" | grep -E "catch\s*\(\s*\)" > /dev/null; then
  VIOLATIONS="$VIOLATIONS\n- Empty catch block detected"
fi

if [ -n "$VIOLATIONS" ]; then
  echo "{\"continue\": true, \"reason\": \"Violations detected:$VIOLATIONS\"}"
  # Log to Axiom DB
  axiom_mcp_principles action=check code="$TOOL_RESULT"
fi
exit 0
```

### 5. Progress Notifications

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": ".*waiting.*",
        "hooks": [
          {
            "type": "command",
            "command": "axiom-notify-progress"
          }
        ]
      }
    ]
  }
}
```

Create `axiom-notify-progress` script:
```bash
#!/bin/bash
# Show current task status
axiom_mcp_status view=tasks format=summary | head -20

# Play sound or send notification
if command -v notify-send > /dev/null; then
  notify-send "Axiom MCP" "Claude is waiting for input"
fi
exit 0
```

## Benefits for Axiom MCP

### 1. **Enforcement of Principles**
- Automatically block TODO-only implementations
- Force actual code generation
- Verify files are created, not just planned

### 2. **Real-time Observability**
- Stream verbose output as it happens
- Monitor parallel executions
- Track resource usage and performance

### 3. **Intelligent Intervention**
- Detect and fix violations automatically
- Apply consistent formatting
- Enforce coding standards

### 4. **Workflow Automation**
- Auto-commit successful implementations
- Run tests after code changes
- Update documentation automatically

### 5. **Enhanced User Experience**
- Get notifications when input is needed
- See progress without asking
- Automatic error recovery

## Implementation Strategy

1. **Phase 1: Basic Hooks**
   - PreToolUse validation
   - PostToolUse logging
   - Simple notifications

2. **Phase 2: Violation Detection**
   - Code quality checks
   - Security scanning
   - Performance analysis

3. **Phase 3: Advanced Automation**
   - Parallel execution monitoring
   - MCTS optimization triggers
   - Automatic intervention

4. **Phase 4: Full Integration**
   - WebSocket streaming to UI
   - Real-time visualization
   - Predictive interventions

## Security Considerations

⚠️ **Important**: Hooks run with full user permissions!

1. **Validate All Inputs**
   ```bash
   # Always sanitize tool arguments
   SAFE_ARG=$(echo "$TOOL_ARGS" | sed 's/[;&|`$]//g')
   ```

2. **Use Absolute Paths**
   ```bash
   # Avoid path injection
   AXIOM_ROOT="/home/user/axiom-mcp"
   LOG_FILE="$AXIOM_ROOT/logs-v3/latest.log"
   ```

3. **Limit Execution Time**
   ```bash
   # Prevent hanging hooks
   timeout 5s your-command || exit 0
   ```

4. **Log All Actions**
   ```bash
   # Audit trail
   echo "$(date): Hook executed: $0" >> hooks.log
   ```

## Example: Complete Hook Configuration

Create `~/.claude_code/hooks.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "axiom_mcp_spawn",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/local/bin/axiom-pre-spawn"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "axiom_mcp_spawn",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/local/bin/axiom-post-spawn"
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/local/bin/axiom-format"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/local/bin/axiom-finalize"
          }
        ]
      }
    ]
  }
}
```

## Testing Hooks

```bash
# Test hook manually
TOOL_NAME="axiom_mcp_spawn" TOOL_ARGS='{"prompt":"test"}' ./axiom-pre-spawn

# Check exit code
echo $?

# View hook logs
tail -f ~/.claude_code/hooks.log
```

## Conclusion

Hooks provide the missing piece for Axiom MCP's vision of observable, interventional execution. By combining hooks with our MCP tools, we can create a fully automated system that:

1. Never produces TODO-only outputs
2. Automatically fixes violations
3. Streams progress in real-time
4. Learns from successful patterns
5. Intervenes before failures occur

This is the bridge between our parallel execution engine and real-world development workflows.