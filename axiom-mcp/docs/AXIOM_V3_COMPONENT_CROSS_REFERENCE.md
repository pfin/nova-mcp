# Axiom MCP v3: Component Cross-Reference Analysis

## Overview

This document maps the relationships between components, identifying connected systems, orphaned code, and integration points that need attention.

## Component Relationship Matrix

### ✅ Fully Connected Components

| Component | Connected To | Integration Status | Purpose |
|-----------|--------------|-------------------|---------|
| PTY Executor | axiom-mcp-spawn | ✅ Active | Primary execution engine |
| Stream Parser | PTY Executor | ✅ Real-time | Extracts events from output |
| Rule Verifier | Stream Parser | ✅ Connected | Enforces principles |
| Conversation DB | All tools | ✅ Storing | Persistence layer |
| Intervention System | PTY Executor | ✅ Since 18:43 | Real-time corrections |

### ⚠️ Partially Connected Components

| Component | Should Connect To | Current Status | Gap |
|-----------|------------------|----------------|-----|
| SDK Executor | axiom-mcp-spawn | ⚠️ Added 20:10 | Not fully tested |
| Event Bus | All components | ⚠️ Logging only | No pub/sub |
| Status Manager | Database | ⚠️ Memory only | No persistence |
| Universal Principles | Pre-execution | ⚠️ Post-check only | Should modify prompts |

### ❌ Orphaned Components

| Component | Purpose | Why Orphaned | Integration Effort |
|-----------|---------|--------------|-------------------|
| Master Controller | Orchestration | Never wired to tools | High |
| Worker Threads | Parallelism | No task distribution | High |
| Port Graph | Communication | No message routing | Medium |
| Stream Interceptor | Monitoring | Duplicate of parser | Low |
| MCTS Engine | Path optimization | No reward connection | High |
| WebSocket Server | Real-time UI | No client | Medium |
| Guided Executor | Demo system | Separate demo | Low |

## Data Flow Analysis

### Current Flow (Sequential)
```
User Request
    ↓
axiom_mcp_spawn
    ↓
executeWithPty/Sdk (Parent)
    ↓
[Silent Wait]
    ↓
executeWithPty/Sdk (Children) ← No visibility
    ↓
Final Output
```

### Intended Flow (Parallel)
```
User Request
    ↓
axiom_mcp_spawn
    ↓
Master Controller
    ├─→ Worker 1 → Stream → Aggregator → Output
    ├─→ Worker 2 → Stream → Aggregator → Output
    └─→ Worker 3 → Stream → Aggregator → Output
         ↓
    MCTS Scoring
         ↓
    Synthesis
```

## Integration Points Analysis

### 1. Stream Aggregation Gap
**Missing Link**: Child executors → Stream aggregator → Console output

**Required Connections**:
- `executeWithPty` needs optional `streamAggregator` parameter
- `StreamAggregator` class needs to be created
- Output routing logic needed

### 2. MCTS Reward Gap
**Missing Link**: Verification results → MCTS reward calculation

**Required Connections**:
- `RuleVerifier` results → `MCTSNode.backpropagate()`
- File creation metrics → Reward score
- Success patterns → Future node selection

### 3. Worker Thread Gap
**Missing Link**: Task queue → Worker pool → Parallel execution

**Required Connections**:
- `handleAxiomMcpSpawn` → `MasterController.executeTask()`
- `MasterController` → Worker thread spawn
- Worker results → Status aggregation

### 4. Port Communication Gap
**Missing Link**: Agent ports → Message routing → Inter-agent chat

**Required Connections**:
- Port allocation → Actual TCP/IPC binding
- Message protocol definition
- Router implementation

## Database Usage Analysis

### Active Tables
- ✅ **conversations**: Every execution tracked
- ✅ **actions**: Events stored real-time
- ✅ **streams**: Raw output captured

### Unused Capabilities
- ❌ **observation_views**: Table exists, no views created
- ❌ **Stream replay**: Data stored but no playback
- ❌ **Pattern analysis**: No queries for patterns
- ❌ **Intervention effectiveness**: No success metrics

## Event System Analysis

### Events Generated
```typescript
// From PTY Executor
- 'data': Output chunks
- 'error': Execution errors
- 'exit': Process termination

// From Stream Parser
- 'event': Parsed patterns

// From Rule Verifier
- (No events, should emit violations)
```

### Events Needed
```typescript
// For Stream Aggregation
- 'child-start': Child task beginning
- 'child-output': Prefixed child output
- 'child-complete': Child task done

// For MCTS
- 'node-selected': Path chosen
- 'reward-calculated': Score assigned
- 'best-path-found': Optimal solution

// For Learning
- 'pattern-detected': Repeated behavior
- 'intervention-success': Correction worked
- 'rule-evolved': Principle updated
```

## File Organization Analysis

### Well-Organized
- `/executors`: Clear separation of execution strategies
- `/principles`: Universal rules in one place
- `/database`: Clean data layer
- `/tools`: MCP tool definitions

### Needs Refactoring
- `/src-v3` vs `/src`: Version confusion
- Test files mixed with source
- Demo code in main tree
- Duplicate functionality (stream-parser vs stream-interceptor)

## Configuration Gaps

### Missing Configuration System
```typescript
// Needed but not implemented:
interface AxiomConfig {
  execution: {
    defaultMode: 'pty' | 'sdk';
    parallelism: number;
    timeout: number;
  };
  intervention: {
    planningTimeout: number;
    progressCheck: number;
    enabled: boolean;
  };
  streaming: {
    mode: 'console' | 'websocket' | 'both';
    aggregation: boolean;
  };
  mcts: {
    explorationConstant: number;
    maxDepth: number;
    rewardWeights: {...};
  };
}
```

## Testing Infrastructure

### Unit Tests
- ❌ No unit tests for core components
- ❌ No intervention testing
- ❌ No MCTS verification

### Integration Tests
- ⚠️ Some WebSocket tests exist
- ⚠️ Basic worker thread tests
- ❌ No end-to-end flow tests

### Missing Test Scenarios
1. Parallel execution coordination
2. Intervention effectiveness
3. Stream aggregation correctness
4. MCTS path selection
5. Database consistency

## Dependency Analysis

### Core Dependencies (Used)
- `@modelcontextprotocol/sdk`: MCP protocol
- `node-pty`: Terminal emulation
- `sqlite3`: Database
- `zod`: Schema validation

### Added Dependencies (Unused)
- `multiplex`: For stream aggregation (planned)
- `blessed`: Terminal UI (not implemented)
- Worker threads: Built-in but underused

### Missing Dependencies
- Configuration management
- Structured logging
- Metrics collection
- Testing framework

## Performance Considerations

### Current Bottlenecks
1. **Sequential child execution**: No parallelism
2. **Blocking waits**: Can't interact during execution
3. **No caching**: Repeated operations
4. **Full output storage**: Unbounded growth

### Optimization Opportunities
1. **Stream sampling**: Don't store every byte
2. **Lazy evaluation**: MCTS on demand
3. **Connection pooling**: Reuse Claude sessions
4. **Incremental verification**: Check as-you-go

## Security Considerations

### Current Risks
1. **Unbounded execution**: No resource limits
2. **Injection potential**: Interventions into PTY
3. **No sandboxing**: Full system access
4. **Credential exposure**: In command strings

### Needed Safeguards
1. Resource quotas per task
2. Input sanitization
3. Execution isolation
4. Credential management

## Recommendations Priority

### Immediate (This Week)
1. **Complete Stream Aggregation**: Connect the missing link
2. **Test SDK Executor**: Verify new integration
3. **Document Configuration**: Define settings structure

### Short Term (This Month)
1. **Wire Master Controller**: Enable parallelism
2. **Connect MCTS Rewards**: Intelligent path selection
3. **Add Basic Tests**: Prevent regressions

### Long Term (Q1 2025)
1. **Implement Port Graph**: Agent communication
2. **Build Learning System**: Pattern evolution
3. **Create Debug Tools**: Replay and analysis

## Conclusion

The Axiom MCP v3 system has strong architectural bones but weak connective tissue. Most components exist in isolation, waiting to be wired together. The recent SDK executor addition (20:10) shows progress, but fundamental gaps remain in stream aggregation and parallel execution.

**Key Insight**: The difference between vision and reality isn't missing components—it's missing connections.

---

*Cross-Reference Analysis Version 1.0*  
*Last Updated: January 7, 2025*