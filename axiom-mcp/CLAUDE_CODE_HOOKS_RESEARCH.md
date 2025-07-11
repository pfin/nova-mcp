# Claude Code Hooks Research - January 2025

## Official Claude Code Hook Types

Based on official documentation and the claude-code-hooks-mastery repository, Claude Code supports exactly 5 hook types:

### 1. **PreToolUse**
- **When**: Before any tool execution
- **Can Block**: YES (exit code 2 or decision="block")
- **Payload**: `tool_name`, `tool_input`
- **Use Cases**: Security validation, parameter checking, dangerous command prevention

### 2. **PostToolUse**
- **When**: After tool completion
- **Can Block**: NO (tool already executed)
- **Payload**: `tool_name`, `tool_input`, `tool_response`
- **Use Cases**: Logging, result validation, transcript conversion

### 3. **Notification**
- **When**: Claude Code sends notifications
- **Can Block**: NO
- **Payload**: `message` content
- **Use Cases**: Custom alerts, user notifications, logging

### 4. **Stop**
- **When**: Claude Code finishes responding
- **Can Block**: YES (can prevent Claude from stopping)
- **Payload**: `stop_hook_active` flag
- **Use Cases**: Completion validation, ensuring tasks finish

### 5. **SubagentStop**
- **When**: Subagents (Task tools) finish
- **Can Block**: Similar to Stop
- **Payload**: `stop_hook_active` flag
- **Use Cases**: Subagent completion tracking

## Hook Control Mechanisms

### Exit Codes
- **0**: Success (stdout shown in transcript mode)
- **2**: Blocking error (stderr fed to Claude)
- **Other**: Non-blocking error (stderr shown to user)

### JSON Output Control
```json
{
  "continue": true/false,
  "stopReason": "message",
  "suppressOutput": true/false,
  "decision": "approve|block",
  "reason": "explanation"
}
```

## Integration with Axiom MCP

Claude Code hooks are **external** to Axiom MCP. They:
- Execute as shell commands via `.claude/settings.json`
- Receive JSON via stdin
- Control Claude Code behavior via exit codes/JSON
- Run with full user permissions

Axiom MCP hooks are **internal**:
- Part of the MCP server process
- Can modify execution in real-time
- Have access to internal state
- Run within Node.js/TypeScript

## META-AXIOM Implementation Plan

### Concept: Bridge Claude Code hooks with Axiom internal hooks

1. **Create `.claude/hooks/` directory** in Axiom project
2. **Implement PreToolUse hook** that:
   - Logs all axiom_spawn calls to a metrics file
   - Tracks patterns of successful/failed prompts
   - Feeds data back to Axiom for learning

3. **Implement Stop hook** that:
   - Analyzes execution results
   - Generates improvement suggestions
   - Updates Axiom's pattern database

4. **Internal META-AXIOM hook** in Axiom that:
   - Reads metrics from Claude Code hooks
   - Adjusts intervention patterns
   - Self-modifies based on success rates

## RESEARCH-AXIOM Implementation Plan

### Concept: Time-boxed research with forced implementation

1. **Modify validation-hook.ts** to:
   - Allow "research" keyword BUT start a timer
   - After 2 minutes, inject intervention
   - Track what was researched

2. **Create research-tracking-hook.ts** that:
   - Monitors research phase output
   - Extracts key findings
   - Converts to implementation tasks

3. **Claude Code PreToolUse hook** that:
   - Detects pure research prompts
   - Adds time limit warning to prompt
   - Logs research topics for pattern analysis

## Next Steps

1. Create `.claude/` directory structure in axiom-mcp
2. Implement Claude Code hooks that communicate with Axiom
3. Modify Axiom's validation hook to allow time-boxed research
4. Create bidirectional data flow between external and internal hooks
5. Test meta-learning capabilities

## Key Insight

Claude Code hooks and Axiom MCP hooks serve different purposes:
- **Claude Code hooks**: Control Claude's behavior externally
- **Axiom MCP hooks**: Control execution internally

The power comes from combining both systems for meta-level control and learning.