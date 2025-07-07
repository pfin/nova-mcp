# Axiom MCP v3: Current State Documentation

## Executive Summary

Axiom MCP v3 is a parallel execution observatory that enforces real implementation through observation and intervention. As of January 2025, all components are built and intervention is connected, but child task visibility remains the critical bottleneck.

## System Status (January 7, 2025)

### ✅ What's Working

1. **Real-Time Intervention System** (Connected Jan 6, 18:43)
   - 30-second planning timeout triggers interventions
   - TODO/FIXME detection with immediate correction
   - 10-second progress checks ensure file creation
   - Interventions injected via `executor.write()`

2. **Observability Infrastructure**
   - SQLite database tracks all conversations, actions, and streams
   - Stream parser extracts events in real-time
   - Complete audit trail of every execution

3. **Universal Principles Enforcement**
   - Temporal awareness (always bash date)
   - No TODOs or placeholders allowed
   - No mock data or fake implementations
   - Real execution only
   - Verify operations succeed
   - No orphaned documentation files

4. **PTY Executor**
   - Prevents 30-second Claude CLI timeout
   - Character-by-character output monitoring
   - Enables real-time intervention

### ❌ Critical Issues

1. **Silent Child Task Execution**
   - Child tasks run without visible output
   - Blocking execution - can't continue until all complete
   - Interventions happen but aren't visible
   - Makes debugging nearly impossible

2. **Claude CLI Limitation**
   - Doesn't execute code directly
   - Only returns text output
   - Requires alternative execution approach

## How the System Works

### 1. Execution Flow

```
User Request → axiom_mcp_spawn → PTY Executor → Claude CLI
                                       ↓
                              Stream Parser (real-time)
                                       ↓
                              Database Storage
                                       ↓
                              Rule Verifier
                                       ↓
                              Intervention (if needed)
```

### 2. Intervention Mechanism

When violations are detected, the system intervenes in real-time:

```typescript
// Example: Planning timeout intervention
if (Date.now() - planningStartTime > 30000) {
  const intervention = '\n\n[INTERVENTION] You have been planning for 30 seconds without creating any files. Stop planning and start implementing now!\n\n';
  await executor.write(intervention);
}
```

### 3. Database Schema

**Conversations Table**
- Tracks task hierarchy (parent_id for trees)
- Status: active, completed, failed
- Metadata includes spawn patterns

**Actions Table**
- Records all significant events
- Types: file_created, file_modified, command_executed, error, intervention
- Linked to conversations

**Streams Table**
- Raw output chunks
- Parsed event data
- Character-by-character history

## Intervention Statistics

The system tracks intervention effectiveness:

```javascript
interventionStats = {
  totalInterventions: 0,
  planningTimeouts: 0,     // 30s planning limit
  todoViolations: 0,       // TODO/FIXME detected
  progressChecks: 0,       // No files after 10s
  successfulFileCreation: 0 // Files actually created
}
```

## Critical Discovery (Jan 6, 2025)

**The Problem**: While interventions work perfectly for single tasks, spawned child tasks execute silently, making the system unusable for complex multi-task execution.

**The Solution**: Implement Verbose Master Mode to stream all child output with prefixes, making execution non-blocking and visible.

## Universal Principles in Action

### Coding Principles
1. **No Orphaned Files** - Update existing docs, don't create random files
2. **No Mocks Ever** - Real execution, real data only
3. **Real Execution Only** - No simulations or dry runs
4. **Verify Don't Trust** - Check every operation succeeded
5. **No TODOs** - Implement fully or not at all
6. **Observable Operations** - Every action must be visible

### Thinking Principles
1. **Temporal Awareness** - Always know current time
2. **Fail Fast and Loudly** - Clear errors immediately
3. **Concrete Over Abstract** - Specific implementations
4. **Measure Don't Guess** - Base decisions on data
5. **Explicit Over Implicit** - Make intentions clear

## Next Steps: Verbose Master Mode

**Why**: Child tasks execute silently, blocking all visibility and progress.

**What**: Stream aggregation system that:
- Makes execution non-blocking
- Prefixes output by task
- Shows interventions in real-time
- Enables parallel monitoring

**How**: 
1. Add `verboseMasterMode` flag
2. Create StreamAggregator class
3. Use multiplex for stream management
4. Non-blocking child execution

## Usage Examples

### Basic Spawn
```javascript
axiom_mcp_spawn({
  parentPrompt: "implement a factorial function",
  spawnPattern: "decompose",
  spawnCount: 3
})
```

### With Interventions
When Claude starts planning instead of coding:
- After 10s: `[PROGRESS CHECK]` appears
- After 30s: `[INTERVENTION]` forces implementation
- TODO detection: Immediate `[INTERVENTION]`

## File Structure

```
axiom-mcp/
├── src-v3/                 # v3 implementation
│   ├── index.ts           # MCP server
│   ├── tools/             # MCP tools
│   │   └── axiom-mcp-spawn.ts  # Main spawn tool
│   ├── executors/         # PTY executor
│   ├── database/          # SQLite observability
│   ├── parsers/           # Stream parsing
│   ├── verifiers/         # Rule enforcement
│   └── principles/        # Universal principles
├── dist-v3/               # Compiled JavaScript
└── logs-v3/               # Event logs
```

## Philosophy

The entire system is built on one core belief:

> **AI should write real code, not descriptions of code.**

Every component - from the PTY executor to the intervention system - exists to enforce this single principle. If it doesn't create files, it's not working.

## Remember

- Planning is allowed, but must lead to file creation
- The observer ensures execution happens
- Interventions guide, not punish
- Success is measured in files created, not words written

---

*Last Updated: January 7, 2025*