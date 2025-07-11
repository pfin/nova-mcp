# Axiom MCP Hooks Research Findings - January 2025

## Table of Contents
- [Claude Code Hooks vs Axiom MCP Hooks](#claude-code-hooks-vs-axiom-mcp-hooks)
- [Claude Code Hook Types](#claude-code-hook-types)
- [Hook Communication Protocol](#hook-communication-protocol)
- [Meta-Learning Architecture](#meta-learning-architecture)
- [Research-Axiom Implementation](#research-axiom-implementation)
- [Integration Strategy](#integration-strategy)
- [Key Discoveries](#key-discoveries)
- [References](#references)

## Claude Code Hooks vs Axiom MCP Hooks

### Critical Distinction
- **Claude Code Hooks**: External shell commands that control Claude's behavior
- **Axiom MCP Hooks**: Internal TypeScript hooks within the MCP server process

### Comparison Table

| Feature | Claude Code Hooks | Axiom MCP Hooks |
|---------|------------------|-----------------|
| Location | `.claude/settings.json` | `src-v4/hooks/` |
| Language | Any (Python, shell, etc) | TypeScript |
| Execution | External process | Internal to MCP |
| Access | Via stdin/stdout/exit codes | Direct object access |
| Permissions | Full user permissions | MCP server context |
| State | Stateless per invocation | Stateful |

## Claude Code Hook Types

Based on research from:
- [Official Claude Code Hooks Documentation](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Claude Code Hooks Mastery Repository](https://github.com/disler/claude-code-hooks-mastery)

### 1. PreToolUse
```json
{
  "matcher": "axiom_spawn",
  "hooks": [{
    "type": "command",
    "command": "uv run .claude/hooks/pre_tool_use.py"
  }]
}
```
- **Fires**: Before tool execution
- **Can Block**: YES (exit code 2)
- **Payload**: `tool_name`, `tool_input`
- **Use Case**: Validate/block dangerous commands

### 2. PostToolUse
```json
{
  "matcher": "",
  "hooks": [{
    "type": "command",
    "command": "uv run .claude/hooks/post_tool_use.py"
  }]
}
```
- **Fires**: After tool completion
- **Can Block**: NO (tool already executed)
- **Payload**: `tool_name`, `tool_input`, `tool_response`
- **Use Case**: Logging, analysis, learning

### 3. Notification
- **Fires**: On Claude notifications
- **Can Block**: NO
- **Payload**: `message`
- **Use Case**: User alerts, logging

### 4. Stop
- **Fires**: When Claude finishes responding
- **Can Block**: YES (prevent stopping)
- **Payload**: `stop_hook_active`
- **Use Case**: Ensure task completion

### 5. SubagentStop
- **Fires**: When subagents finish
- **Can Block**: Similar to Stop
- **Payload**: `stop_hook_active`
- **Use Case**: Track parallel executions

## Hook Communication Protocol

### Exit Code Behavior
```python
# Success - stdout shown in transcript
sys.exit(0)

# Blocking error - stderr fed to Claude
sys.exit(2)

# Non-blocking error - stderr shown to user
sys.exit(1)
```

### JSON Control Protocol
```json
{
  "continue": true,
  "stopReason": "message when continue=false",
  "suppressOutput": true,
  "decision": "approve|block",
  "reason": "explanation for decision"
}
```

## Meta-Learning Architecture

### Concept: Bidirectional Hook Communication

```
┌─────────────────────┐     ┌─────────────────────┐
│  Claude Code Hooks  │     │  Axiom MCP Hooks    │
├─────────────────────┤     ├─────────────────────┤
│ PreToolUse          │────▶│ Pattern Database    │
│ - Log patterns      │     │ - Store successes   │
│ - Block failures    │◀────│ - Update rules      │
├─────────────────────┤     ├─────────────────────┤
│ PostToolUse         │────▶│ Meta-Axiom Hook     │
│ - Analyze results   │     │ - Learn patterns    │
│ - Extract insights  │◀────│ - Generate hooks    │
└─────────────────────┘     └─────────────────────┘
```

### Implementation Files
- `.claude/hooks/pre_tool_use.py` - Pattern tracking
- `.claude/hooks/post_tool_use.py` - Result analysis
- `src-v4/hooks/meta-axiom-hook.ts` - Internal learning
- `logs/axiom-patterns.json` - Shared pattern database

## Research-Axiom Implementation

### Problem Solved
Axiom's validation hook blocks all research/analysis prompts, but sometimes research is necessary before implementation.

### Solution: Time-Boxed Research
```typescript
// research-axiom-hook.ts
export const researchAxiomHook: Hook = {
  name: 'research-axiom-hook',
  events: [HookEvent.REQUEST_RECEIVED, HookEvent.EXECUTION_STREAM],
  priority: 95, // Higher than validation
  
  handler: async (context) => {
    if (context.event === HookEvent.REQUEST_RECEIVED) {
      if (/\b(research|analyze|explore)\b/i.test(prompt)) {
        // Allow but mark with timer
        return {
          action: 'continue',
          modifications: {
            __research_mode: true,
            __research_start: Date.now(),
            __research_limit: 120000 // 2 minutes
          }
        };
      }
    }
    
    if (context.event === HookEvent.EXECUTION_STREAM) {
      if (context.execution?.__research_mode) {
        const elapsed = Date.now() - context.execution.__research_start;
        if (elapsed > context.execution.__research_limit) {
          return {
            action: 'modify',
            modifications: {
              command: '\n[INTERVENTION] Research time expired! Start implementing now!\n'
            }
          };
        }
      }
    }
  }
};
```

## Integration Strategy

### 1. Directory Structure
```
axiom-mcp/
├── .claude/
│   ├── settings.json          # Claude Code hook config
│   └── hooks/
│       ├── pre_tool_use.py    # Pattern tracking
│       ├── post_tool_use.py   # Result analysis
│       └── stop.py            # Completion tracking
├── src-v4/
│   └── hooks/
│       ├── meta-axiom-hook.ts # Internal learning
│       └── research-axiom-hook.ts # Time-boxed research
└── logs/
    ├── axiom-patterns.json    # Shared pattern DB
    └── research-insights.json # Research tracking
```

### 2. Data Flow
1. **Claude Code PreToolUse** → Log prompt patterns
2. **Axiom Execution** → Apply learned patterns
3. **Claude Code PostToolUse** → Analyze results
4. **Meta-Axiom Hook** → Update pattern database
5. **Research-Axiom Hook** → Extract research insights

## Key Discoveries

### 1. Hook Execution Environment
- Claude Code hooks run as separate processes
- 60-second timeout per hook
- Full user permissions (security consideration)
- JSON communication via stdin/stdout

### 2. Blocking Capabilities
- **PreToolUse**: Can block before execution ✓
- **PostToolUse**: Cannot block (too late) ✗
- **Stop**: Can prevent Claude from stopping ✓
- **Exit code 2**: Universal blocking mechanism

### 3. Pattern Learning Opportunities
- Track successful prompt patterns
- Identify failure modes
- Build intervention rules
- Self-improve over time

### 4. Research Mode Innovation
- Time-boxed research prevents drift
- Forced implementation after timeout
- Research insights feed meta-learning
- Balances exploration vs execution

## References

### Official Documentation
- [Claude Code Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Claude Code Settings](https://docs.anthropic.com/en/docs/claude-code/settings)
- [MCP SDK Documentation](https://modelcontextprotocol.io/docs)

### Implementation Examples
- [Claude Code Hooks Mastery](https://github.com/disler/claude-code-hooks-mastery)
- [UV Single-File Scripts](https://docs.astral.sh/uv/guides/scripts/)

### Related Files in This Project
- [HOOKS_ARCHITECTURE.md](./HOOKS_ARCHITECTURE.md) - Axiom internal hooks
- [CLAUDE_CODE_HOOKS_RESEARCH.md](../CLAUDE_CODE_HOOKS_RESEARCH.md) - Research summary
- [AXIOM_V3_MASTER_PLAN.md](./AXIOM_V3_MASTER_PLAN.md) - Overall architecture

### Code Locations
- Hook Orchestrator: `src-v4/core/hook-orchestrator.ts`
- Validation Hook: `src-v4/hooks/validation-hook.ts`
- Intervention Hook: `src-v4/hooks/intervention-hook.ts`
- Meta-Axiom Hook: `src-v4/hooks/meta-axiom-hook.ts` (in progress)
- Research-Axiom Hook: `src-v4/hooks/research-axiom-hook.ts` (in progress)

## Next Steps

1. **Complete Implementation**
   - Finish `.claude/hooks/` setup
   - Test bidirectional communication
   - Validate pattern learning

2. **Measure Success**
   - Track prompt success rates
   - Monitor intervention effectiveness
   - Analyze research-to-implementation conversion

3. **Iterate and Improve**
   - Use meta-learning to generate new hooks
   - Refine time-boxing algorithms
   - Expand pattern recognition

---

*This document consolidates all research findings about integrating Claude Code hooks with Axiom MCP's internal hook system for meta-learning and controlled research capabilities.*