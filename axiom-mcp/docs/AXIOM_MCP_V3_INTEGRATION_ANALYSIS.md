# Axiom MCP v3 Complete Integration Analysis

## Executive Summary

Axiom MCP v3 has all components built but NOT connected. The hooks system exists but operates externally. This document provides a file-by-file analysis of the current state and a unified execution plan to wire everything together.

## Current State Analysis

### 🟢 Connected Components (Working)

#### 1. Core MCP Server (`src-v3/index.ts`)
- **Status**: ✅ Working
- **Exposes**: 7 MCP tools (spawn, test, observe, principles, logs, settings, status)
- **Connected to**: StatusManager, ConversationDB, EventBus
- **Missing**: VerboseMonitor, WebSocketServer, MCTS

#### 2. PTY Executor (`src-v3/executors/pty-executor.ts`)
- **Status**: ✅ Working
- **Used by**: axiom-mcp-spawn tool
- **Features**: Character streaming, event emission
- **Missing**: Verbose mode output, intervention injection

#### 3. Stream Monitoring (`src-v3/monitors/stream-interceptor.ts`)
- **Status**: ✅ Partially working
- **Pipeline**: PTY → StreamInterceptor → RuleEngine → Interventions
- **Missing**: Hook integration, real-time output

#### 4. Database & Logging
- **ConversationDB**: ✅ Stores conversations, actions, streams
- **EventBus**: ✅ Logs to JSONL files
- **Missing**: Hook event tracking, WebSocket emission

### 🔴 Orphaned Components (Disconnected)

#### 1. Verbose Monitor (`src-v3/monitors/verbose-monitor.ts`)
- **Status**: ❌ Built but never imported
- **Purpose**: Real-time character-by-character output
- **Should be**: Connected when verboseMasterMode=true

#### 2. Stream Aggregator (`src-v3/aggregators/stream-aggregator.ts`)
- **Status**: ❌ Built but never used
- **Purpose**: Merge outputs from parallel streams
- **Should be**: Used for multi-stream verbose mode

#### 3. Master Controller (`src-v3/core/master-controller.ts`)
- **Status**: ❌ Contains MCTS logic but orphaned
- **Purpose**: Parallel execution orchestration
- **Should be**: Main controller for spawn operations

#### 4. WebSocket Server (`src-v3/server/websocket-server.ts`)
- **Status**: ❌ Never started
- **Purpose**: Real-time monitoring UI
- **Should be**: Started on MCP server init

#### 5. Alternative Executors
- **SDKExecutor**: ❌ Alternative to PTY, not connected
- **GuidedExecutor**: ❌ For guided workflows, not connected

#### 6. Interactive Controller (`src-v3/monitors/interactive-controller.ts`)
- **Status**: ❌ Has pause/resume but never used
- **Purpose**: Manual intervention during execution
- **Should be**: Available for interactive debugging

### 🟡 External Hook System

#### Current Hook Scripts
1. `axiom-validate-concrete.sh` - Pre-execution validation
2. `axiom-stream-monitor.sh` - Attempts real-time monitoring
3. `axiom-intervene.sh` - Pattern-based interventions
4. `axiom-verify-implementation.sh` - Post-execution checks
5. `axiom-format-code.sh` - Auto-formatting
6. `axiom-finalize.sh` - Session summary

**Problem**: Shell scripts can't interact with TypeScript runtime!

## File-by-File Before/After Analysis

### 1. `src-v3/tools/axiom-mcp-spawn.ts`

**BEFORE**:
```typescript
// Verbose mode flag exists but doesn't use VerboseMonitor
if (args.verboseMasterMode) {
  // Just passes flag to executor, no special handling
}
```

**AFTER**:
```typescript
// Connect VerboseMonitor and StreamAggregator
if (args.verboseMasterMode) {
  const verboseMonitor = new VerboseMonitor(eventBus);
  const aggregator = new StreamAggregator();
  
  // Hook integration point
  await hookManager.trigger('verbose_mode_start', { taskId });
  
  executor.on('data', (chunk) => {
    verboseMonitor.processChunk(chunk);
    aggregator.addChunk(taskId, chunk);
  });
}
```

### 2. `src-v3/index.ts`

**BEFORE**:
```typescript
// WebSocket server never started
// No hook system integration
const server = new Server({ name: 'axiom-mcp' });
```

**AFTER**:
```typescript
// Start WebSocket server for real-time monitoring
const wsServer = new WebSocketServer({ port: 8080 });
wsServer.start();

// Initialize hook manager
const hookManager = new HookManager({
  hooksDir: './hooks',
  eventBus,
  conversationDB
});

// Connect to MCP lifecycle
server.on('tool_call', async (tool, args) => {
  await hookManager.trigger('pre_tool_use', { tool, args });
});
```

### 3. `src-v3/executors/pty-executor.ts`

**BEFORE**:
```typescript
// Just emits data, no intervention injection
this.pty.onData((data) => {
  this.emit('data', data);
});
```

**AFTER**:
```typescript
// Hook-aware data processing
this.pty.onData(async (data) => {
  // Pre-process hooks
  const processed = await this.hookManager.processStream('stream_data', data);
  
  // Check for intervention commands
  if (this.interventionQueue.length > 0) {
    const intervention = this.interventionQueue.shift();
    this.pty.write(intervention.command);
  }
  
  this.emit('data', processed);
});
```

### 4. New File: `src-v3/hooks/hook-manager.ts`

**CREATE**:
```typescript
export class HookManager {
  private hooks: Map<string, Hook[]> = new Map();
  
  async trigger(event: string, data: any): Promise<any> {
    const hooks = this.hooks.get(event) || [];
    
    for (const hook of hooks) {
      if (hook.type === 'typescript') {
        // Native TypeScript hooks
        const result = await hook.handler(data);
        if (result.block) return result;
      } else if (hook.type === 'shell') {
        // Legacy shell script support
        const result = await this.executeShellHook(hook, data);
        if (result.block) return result;
      }
    }
    
    return data;
  }
  
  registerNativeHook(event: string, handler: HookHandler) {
    // Register TypeScript functions as hooks
  }
}
```

### 5. `src-v3/monitors/stream-interceptor.ts`

**BEFORE**:
```typescript
// Processes streams but no hook integration
async processChunk(chunk: string): Promise<void> {
  const analysis = await this.analyzer.analyze(chunk);
}
```

**AFTER**:
```typescript
// Hook-aware stream processing
async processChunk(chunk: string): Promise<void> {
  // Pre-analysis hook
  const preprocessed = await this.hookManager.trigger('pre_analysis', { chunk });
  
  const analysis = await this.analyzer.analyze(preprocessed.chunk);
  
  // Post-analysis hook for custom patterns
  await this.hookManager.trigger('post_analysis', { 
    chunk, 
    analysis,
    patterns: analysis.patterns 
  });
}
```

## Unified Execution Plan

### Phase 1: Core Integration (Immediate)

1. **Create HookManager class**
   - TypeScript-native hook system
   - Bridges shell scripts and runtime
   - Event-based architecture

2. **Wire VerboseMonitor**
   - Connect to PTY executor when verboseMasterMode=true
   - Stream to console AND WebSocket
   - Add hook trigger points

3. **Start WebSocketServer**
   - Initialize on server start
   - Connect to EventBus
   - Stream monitoring data

### Phase 2: Hook Migration (Day 1-2)

1. **Convert Shell Hooks to TypeScript**
   ```typescript
   // Before: axiom-validate-concrete.sh
   // After: src-v3/hooks/validate-concrete.ts
   export const validateConcreteHook: Hook = {
     event: 'pre_tool_use',
     handler: async (data) => {
       if (!hasConcreteDeliverables(data.args)) {
         return { block: true, reason: 'Must specify files' };
       }
     }
   };
   ```

2. **Register Native Hooks**
   - Pre-execution validation
   - Stream monitoring
   - Pattern intervention
   - Post-execution verification

3. **Maintain Shell Compatibility**
   - HookManager can still execute .sh files
   - Gradual migration path

### Phase 3: Parallel Execution (Day 3-4)

1. **Connect MasterController**
   - Replace direct PTY execution with MasterController
   - Enable MCTS path selection
   - Support multiple worktrees

2. **Wire StreamAggregator**
   - Collect streams from parallel executions
   - Merge for verbose output
   - Track best performing streams

3. **Enable Worker Threads**
   - Use WorkerManager for parallel execution
   - Isolate execution contexts
   - Share results via ConversationDB

### Phase 4: Complete Integration (Day 5)

1. **Full Hook Integration**
   - Every component has hook points
   - Hooks can modify behavior at runtime
   - Complete observability

2. **Interactive Mode**
   - Connect InteractiveController
   - Enable pause/resume during execution
   - Manual intervention capability

3. **Production Ready**
   - All orphaned components connected
   - Shell hooks migrated to TypeScript
   - Real-time monitoring active

## Implementation Checklist

### Immediate Actions
- [ ] Create `src-v3/hooks/hook-manager.ts`
- [ ] Create `src-v3/hooks/types.ts` for Hook interfaces
- [ ] Update `axiom-mcp-spawn.ts` to use VerboseMonitor
- [ ] Start WebSocketServer in `index.ts`
- [ ] Add HookManager to tool handlers

### Day 1
- [ ] Convert `axiom-validate-concrete.sh` to TypeScript
- [ ] Convert `axiom-stream-monitor.sh` to TypeScript
- [ ] Wire hooks into PTY executor
- [ ] Test verbose mode with hooks

### Day 2
- [ ] Convert remaining shell hooks
- [ ] Add hook configuration to settings
- [ ] Create hook registration API
- [ ] Document hook development

### Day 3
- [ ] Connect MasterController
- [ ] Enable parallel execution
- [ ] Wire StreamAggregator
- [ ] Test multi-stream verbose mode

### Day 4
- [ ] Complete all integrations
- [ ] Remove orphaned imports
- [ ] Update all documentation
- [ ] Final testing

## Success Metrics

1. **No Orphaned Components**: Every built component is used
2. **Hooks Integrated**: All hooks run in TypeScript runtime
3. **Verbose Mode Works**: Real-time streaming to console/WebSocket
4. **Parallel Execution**: Multiple approaches run simultaneously
5. **Complete Observability**: Every action is visible and modifiable

## Conclusion

Axiom MCP v3 has all the pieces but they're not connected. The hooks exist but can't interact with the runtime. This plan wires everything together, creating a truly integrated system where:

- Hooks are first-class TypeScript citizens
- All components are connected and used
- Verbose mode provides real-time visibility
- Parallel execution is actually parallel
- The vision becomes reality

> "From disconnected components to integrated execution guardian."