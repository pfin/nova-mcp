# Axiom MCP v3 Unified Execution Plan

## Mission: Wire Everything Together

Transform Axiom MCP v3 from a collection of disconnected components into a fully integrated execution guardian with native TypeScript hooks.

## Critical Problems to Solve

1. **Verbose Mode Broken**: Flag exists but VerboseMonitor never used
2. **Hooks Can't See Runtime**: Shell scripts operate blindly
3. **No Parallel Execution**: MasterController and MCTS orphaned
4. **No Real-time UI**: WebSocketServer never started
5. **Interventions Don't Inject**: StreamInterceptor can't modify execution

## The Plan: 4 Phases, 5 Days

### Phase 1: Hook Runtime Integration (Day 1)

#### Create Native Hook System
```typescript
// NEW: src-v3/hooks/hook-manager.ts
export class HookManager {
  // Bridge between shell scripts and TypeScript
  // Native hooks with full runtime access
  // Event-driven architecture
}

// NEW: src-v3/hooks/types.ts
export interface Hook {
  event: HookEvent;
  handler: (context: HookContext) => Promise<HookResult>;
}
```

#### Wire Hooks into Execution Flow
1. **Pre-execution**: Tool validation with runtime context
2. **Stream processing**: Pattern detection with intervention
3. **Post-execution**: Verification with database access

#### Immediate Impact
- Hooks can read ConversationDB
- Hooks can inject PTY commands
- Hooks can modify tool arguments
- Full TypeScript debugging

### Phase 2: Connect Orphaned Components (Day 2)

#### 1. Fix Verbose Mode
```typescript
// UPDATE: src-v3/tools/axiom-mcp-spawn.ts
if (args.verboseMasterMode) {
  // BEFORE: Nothing happens
  // AFTER: Actually use VerboseMonitor
  const monitor = new VerboseMonitor(eventBus);
  const aggregator = new StreamAggregator();
  
  executor.on('data', (chunk) => {
    monitor.processChunk(chunk);
    // Real-time output with colors
  });
}
```

#### 2. Start WebSocket Server
```typescript
// UPDATE: src-v3/index.ts
const wsServer = new WebSocketServer({ port: 8080 });
await wsServer.start();

// Connect to event bus
eventBus.on('*', (event) => {
  wsServer.broadcast(event);
});
```

#### 3. Connect StreamInterceptor Properly
```typescript
// UPDATE: src-v3/executors/pty-executor.ts
// Enable intervention injection
if (this.interventionQueue.length > 0) {
  const cmd = this.interventionQueue.shift();
  this.pty.write(cmd);
}
```

### Phase 3: Enable Parallel Execution (Day 3)

#### 1. Wire MasterController
```typescript
// UPDATE: src-v3/tools/axiom-mcp-spawn.ts
// BEFORE: Direct PTY execution
// AFTER: MasterController orchestration
const controller = new MasterController({
  mcts: new MCTSOrchestrator(),
  workerManager: new WorkerThreadManager()
});

const result = await controller.executeTask({
  prompt: args.parentPrompt,
  pattern: args.spawnPattern,
  parallel: args.spawnPattern === 'parallel'
});
```

#### 2. Implement Git Worktree Support
```typescript
// NEW: src-v3/core/worktree-manager.ts
export class WorktreeManager {
  async createWorktree(taskId: string): Promise<string> {
    // Create isolated git worktree
    // Return path for execution
  }
  
  async mergeResults(worktrees: string[]): Promise<void> {
    // Cherry-pick best solutions
  }
}
```

### Phase 4: Complete Integration (Day 4-5)

#### 1. Migrate Shell Hooks to TypeScript

**Before** (Shell):
```bash
#!/bin/bash
# axiom-validate-concrete.sh
if ! echo "$PROMPT" | grep -E "create|implement"; then
  exit 2
fi
```

**After** (TypeScript):
```typescript
// src-v3/hooks/native/validate-concrete.ts
export const validateConcreteHook: Hook = {
  event: 'pre_spawn',
  priority: 100,
  handler: async ({ args, db }) => {
    if (!hasConcreteDeliverables(args.prompt)) {
      // Can check DB for patterns
      const patterns = await db.getViolationPatterns();
      
      return {
        block: true,
        reason: 'Must specify concrete deliverables',
        suggestion: generateSuggestion(args.prompt)
      };
    }
    return { continue: true };
  }
};
```

#### 2. Create Hook Development Kit
```typescript
// NEW: src-v3/hooks/sdk.ts
export class HookSDK {
  // Helper methods for hook developers
  async queryDatabase(query: string): Promise<any>;
  async injectCommand(cmd: string): Promise<void>;
  async getActiveStreams(): Promise<Stream[]>;
  async triggerIntervention(type: string): Promise<void>;
}
```

## Implementation Schedule

### Day 1: Foundation
- [ ] 9:00 AM - Create HookManager and types
- [ ] 10:00 AM - Wire hooks into tool lifecycle
- [ ] 11:00 AM - Create first native hook (validate-concrete)
- [ ] 12:00 PM - Test hook with database access
- [ ] 2:00 PM - Add stream processing hooks
- [ ] 3:00 PM - Create hook configuration system
- [ ] 4:00 PM - Document hook API

### Day 2: Integration
- [ ] 9:00 AM - Fix verbose mode with VerboseMonitor
- [ ] 10:00 AM - Start WebSocketServer
- [ ] 11:00 AM - Connect StreamAggregator
- [ ] 12:00 PM - Wire intervention injection
- [ ] 2:00 PM - Test real-time streaming
- [ ] 3:00 PM - Add color coding to output
- [ ] 4:00 PM - Create monitoring dashboard

### Day 3: Parallelization
- [ ] 9:00 AM - Connect MasterController
- [ ] 10:00 AM - Implement WorktreeManager
- [ ] 11:00 AM - Wire MCTS orchestrator
- [ ] 12:00 PM - Test parallel execution
- [ ] 2:00 PM - Add stream merging
- [ ] 3:00 PM - Implement best-path selection
- [ ] 4:00 PM - Performance optimization

### Day 4: Migration
- [ ] 9:00 AM - Convert all shell hooks to TypeScript
- [ ] 11:00 AM - Create hook test suite
- [ ] 1:00 PM - Add hook hot-reloading
- [ ] 3:00 PM - Create hook marketplace structure

### Day 5: Polish
- [ ] 9:00 AM - Remove all orphaned code
- [ ] 10:00 AM - Update all documentation
- [ ] 11:00 AM - Create integration tests
- [ ] 1:00 PM - Performance benchmarking
- [ ] 3:00 PM - Create demo video
- [ ] 4:00 PM - Release v3.1

## Success Criteria

### Functional Requirements
- ✅ All hooks run in TypeScript with full runtime access
- ✅ Verbose mode streams to console AND WebSocket
- ✅ Parallel execution actually runs in parallel
- ✅ Interventions can inject commands into PTY
- ✅ No orphaned components

### Performance Requirements
- Hook execution < 50ms overhead
- Stream processing < 10ms latency
- Parallel execution 3x faster than sequential
- WebSocket updates < 100ms delay

### Quality Requirements
- 100% of components connected
- 0 orphaned imports
- Full test coverage for hooks
- Documentation for every integration point

## Risk Mitigation

### Risk 1: Breaking Existing Functionality
- **Mitigation**: Feature flags for new integrations
- **Fallback**: Keep old code paths available

### Risk 2: Performance Degradation
- **Mitigation**: Benchmark before/after each phase
- **Fallback**: Async hook execution

### Risk 3: Complex Debugging
- **Mitigation**: Comprehensive logging at every layer
- **Fallback**: Debug mode with step-through

## Deliverables

### Code Deliverables
1. HookManager with native TypeScript support
2. Connected VerboseMonitor and StreamAggregator
3. Working WebSocketServer with dashboard
4. Integrated MasterController with MCTS
5. Complete hook SDK and examples

### Documentation Deliverables
1. Hook Developer Guide
2. Integration Architecture Diagram
3. Performance Benchmarks
4. Migration Guide from v3.0 to v3.1

### Demo Deliverables
1. Video: "Verbose Mode in Action"
2. Video: "Parallel Execution with MCTS"
3. Video: "Hook Development Walkthrough"
4. Live dashboard example

## The Vision Realized

After this integration:
- **Observation**: See everything in real-time via WebSocket
- **Intervention**: Inject fixes during execution
- **Parallelization**: Try multiple approaches simultaneously
- **Learning**: Hooks can query history and adapt
- **Control**: Every aspect modifiable via hooks

> "From disconnected components to unified execution guardian in 5 days."