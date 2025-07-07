# Axiom v4 Architecture

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Tool Request                          │
│                     (axiom_spawn + args)                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HookOrchestrator                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  REQUEST_RECEIVED Event                  │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐    │    │
│  │  │ Validation │→ │  Pattern   │→ │    Security    │    │    │
│  │  │    Hook    │  │    Hook    │  │     Hook       │    │    │
│  │  └────────────┘  └────────────┘  └────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────┘
                                │ (validated/modified request)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION_STARTED Event                       │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐       │
│  │  Verbose   │  │ WebSocket  │  │   Metrics Start     │       │
│  │  Monitor   │  │  Monitor   │  │      Hook           │       │
│  └────────────┘  └────────────┘  └─────────────────────┘       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         PTY Executor                             │
│                    (or other executors)                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ (character stream)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION_STREAM Event                        │
│  ┌────────────┐  ┌─────────────┐  ┌────────────────────┐       │
│  │   Stream   │  │Intervention │  │    WebSocket       │       │
│  │  Monitor   │  │    Hook     │  │    Broadcast       │       │
│  └────────────┘  └──────┬──────┘  └────────────────────┘       │
│                         │ (inject command)                      │
│                         ▼                                       │
│                 ┌───────────────┐                               │
│                 │ PTY.write()   │                               │
│                 └───────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXECUTION_COMPLETED Event                      │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐       │
│  │  Cleanup   │  │   Store    │  │    Notify           │       │
│  │   Hook     │  │  Results   │  │    Clients          │       │
│  └────────────┘  └────────────┘  └─────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Hook Chain Example

When `axiom_spawn` is called with verbose mode and parallel execution:

```
1. REQUEST_RECEIVED
   ├─ ValidationHook (priority: 100)
   │  └─ Validates concrete deliverables
   ├─ ParallelExecutionHook (priority: 85) 
   │  └─ Detects parallel pattern, redirects
   └─ SecurityHook (priority: 80)
      └─ Checks for dangerous operations

2. EXECUTION_STARTED
   ├─ VerboseMonitorHook (priority: 90)
   │  └─ Sets up real-time output
   └─ WebSocketMonitorHook (priority: 70)
      └─ Notifies connected clients

3. EXECUTION_STREAM (continuous)
   ├─ InterventionHook (priority: 80)
   │  └─ Detects patterns, injects fixes
   ├─ VerboseMonitorHook (priority: 90)
   │  └─ Colors and displays output
   └─ WebSocketMonitorHook (priority: 70)
      └─ Broadcasts to dashboard

4. EXECUTION_COMPLETED
   └─ All cleanup hooks run
```

## Parallel Execution Flow

```
                    axiom_spawn (parallel)
                           │
                           ▼
                 ParallelExecutionHook
                           │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   Approach 1        Approach 2        Approach 3
   (TypeScript)      (JavaScript)       (Python)
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                   PARALLEL_MERGE Event
                          │
                    Best Result
```

## Hook Priority System

Higher priority = runs first

- 100+ : Critical validation/security
- 90-99: Monitoring setup
- 80-89: Pattern detection
- 70-79: Broadcasting/logging
- 60-69: Metrics/analytics
- 50-59: Optional enhancements
- 0-49 : Low priority cleanup

## Component Connections

Unlike v3 where components were hardcoded together, v4 components connect through events:

```
VerboseMonitor:
  - Subscribes to: EXECUTION_STARTED, EXECUTION_STREAM
  - No direct coupling to executor

WebSocketServer:
  - Subscribes to: All events
  - No knowledge of other components

StreamAggregator:
  - Subscribes to: PARALLEL_MERGE
  - Doesn't know about individual executors
```

## Extension Points

### Adding a New Feature

Instead of modifying core code, add a hook:

```typescript
// Old way (v3): Edit axiom-mcp-spawn.ts
if (args.enableMetrics) {
  // Add metrics code
}

// New way (v4): Add a hook
export const metricsHook: Hook = {
  name: 'metrics-hook',
  events: [EXECUTION_STARTED, EXECUTION_COMPLETED],
  handler: async (context) => {
    // Metrics logic here
  }
};
```

### Custom Executors

Register new executors without touching core:

```typescript
orchestrator.registerExecutor('docker_spawn', new DockerExecutor());
orchestrator.registerExecutor('k8s_spawn', new K8sExecutor());
```

## Benefits

1. **Decoupled**: Components don't know about each other
2. **Extensible**: Add features by adding hooks
3. **Testable**: Mock individual hooks
4. **Observable**: Every action is an event
5. **Modifiable**: Change behavior at runtime