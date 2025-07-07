# Axiom MCP v3: Inconsistencies and Critical Findings

## Executive Summary

After thorough analysis of the Axiom MCP v3 codebase, I've identified several critical inconsistencies and architectural issues that explain why the system isn't achieving its vision of parallel, observable execution.

## Major Inconsistencies

### 1. SDK Executor Exists But Isn't Used

**Finding**: There's a complete `sdk-executor.ts` that uses the `@anthropic-ai/claude-code` SDK with streaming capabilities, but it's never imported or used anywhere in the codebase.

**Evidence**:
- File exists: `src-v3/executors/sdk-executor.ts`
- Uses streaming: `for await (const message of query({ prompt, options: queryOptions }))`
- No imports found in any other file
- PTY executor is used instead, which pipes to Claude CLI

**Impact**: The system isn't using available streaming capabilities that could solve the visibility problem.

### 2. Claude CLI vs SDK Confusion

**Finding**: The system attempts to use Claude CLI through PTY, but Claude CLI doesn't execute code directly - it only returns text responses.

**Evidence**:
- `axiom-mcp-spawn.ts:275`: Uses `claude` command with no flags
- Expects execution but gets text
- SDK executor would provide actual streaming

**Impact**: Fundamental misunderstanding of what Claude CLI does vs what the SDK provides.

### 3. Intervention System Design Flaw

**Finding**: Interventions are written to the PTY stream AFTER Claude has already been invoked, meaning Claude never sees them.

**Evidence**:
```typescript
// Line 146: await executor.write(intervention);
// But Claude was already launched on line 286!
```

**Impact**: Interventions happen too late to affect Claude's behavior.

### 4. Streaming Infrastructure Not Connected

**Finding**: Multiple streaming components exist but aren't wired together:
- `stream-parser.ts` - Parses events
- `stream-interceptor.ts` - Monitors streams  
- `websocket-server.ts` - WebSocket streaming
- `event-streaming.test.ts` - Tests streaming

**Impact**: All the pieces exist for streaming but aren't integrated.

### 5. Missing Tool Implementations

**Finding**: Several tools are imported but their implementations are missing or importing from v1:

```typescript
// src-v3/index.ts imports from ../src/ (v1) not v3:
import { axiomMcpGoalTool, handleAxiomMcpGoal } from '../src/tools/axiom-mcp-goal.js';
```

**Impact**: v3 is still using v1 tool implementations, creating version confusion.

### 6. Database Schema Mismatch

**Finding**: The database stores streams and actions, but there's no mechanism to replay or aggregate streams from child tasks.

**Evidence**:
- Streams table stores raw chunks
- No aggregation queries
- No stream replay functionality

**Impact**: Data is collected but not used for the stated purpose of observability.

### 7. Worker Threads Not Used

**Finding**: Despite claims of parallelism via worker threads, the actual execution is sequential:

```typescript
// axiom-mcp-spawn.ts:605
await Promise.allSettled(childPromises); // Waits for ALL to complete
```

**Evidence**:
- `task-worker.ts` exists but unused
- `claude-worker.ts` exists but unused
- No actual worker thread spawning

**Impact**: No true parallelism despite architecture supporting it.

### 8. Temporal Awareness Principle Violation

**Finding**: The code checks for "2024" references but the codebase itself may contain outdated assumptions.

**Evidence**:
- `universal-principles.ts:271`: Checks for 2024 references
- But doesn't update its own temporal assumptions

**Impact**: Ironic violation of its own principle.

### 9. Configuration Missing

**Finding**: No configuration system for:
- Enabling/disabling verbose mode
- Setting intervention timeouts
- Choosing between PTY and SDK execution

**Impact**: Hard-coded values throughout, no flexibility.

### 10. Event Bus Underutilized

**Finding**: EventBus exists for pub/sub but most components don't use it:

```typescript
// Only used for logging, not for component communication
eventBus.logEvent({...});
```

**Impact**: Components can't communicate about state changes.

## Critical Architecture Issues

### 1. Execution Model Confusion

The system can't decide between:
- Direct execution (what it claims)
- Claude-mediated execution (what it does)
- SDK streaming (what it should do)

### 2. Intervention Timing

Interventions need to happen at one of these points:
1. **Before Claude** - Modify the prompt
2. **During Claude** - Stream interruption (requires SDK)
3. **After Claude** - Verify and retry

Currently doing #3 but pretending it's #2.

### 3. Missing Feedback Loop

The system collects data but doesn't use it:
- No learning from past violations
- No pattern recognition
- No adaptive interventions

### 4. Synchronous Child Execution

Despite parallel architecture:
- Children execute sequentially
- Parent blocks waiting
- No streaming aggregation

## Recommendations

### Immediate Fixes

1. **Use SDK Executor**: Switch from PTY+CLI to SDK streaming
2. **Fix Intervention Timing**: Modify prompts before sending to Claude
3. **Implement Stream Aggregation**: Use existing WebSocket infrastructure
4. **Enable Worker Threads**: Actually use parallel execution

### Architectural Changes

1. **Execution Strategy Pattern**: Allow switching between PTY/SDK/Direct
2. **Configuration System**: Runtime behavior modification
3. **Event-Driven Architecture**: Use EventBus for all component communication
4. **Stream Replay**: Enable debugging via stream playback

### Missing Components

1. **Stream Aggregator**: Merge multiple child streams
2. **Intervention Planner**: Decide intervention strategy
3. **Result Synthesizer**: Combine outputs from parallel runs
4. **Progress Monitor**: Real-time execution tracking

## Conclusion

Axiom MCP v3 has all the pieces needed for its vision but they're not connected properly. The fundamental issue is trying to force Claude CLI to do something it wasn't designed for, while ignoring the SDK that could provide exactly what's needed.

The intervention system works but intervenes at the wrong time. The streaming infrastructure exists but isn't used. The parallel architecture is built but executes sequentially.

This is a classic case of "all the right pieces in all the wrong places."

---

*Analysis Date: January 7, 2025*