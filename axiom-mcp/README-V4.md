# Axiom MCP v4 - Hook-First Architecture

## What's New in v4?

Axiom v4 is a complete reimagining where **hooks are the architecture**, not an add-on. Everything flows through the HookOrchestrator.

### Key Differences from v3

**v3 Architecture**:
```
Tool → Executor → Output
         ↓
      (Hooks maybe?)
```

**v4 Architecture**:
```
Tool → HookOrchestrator → Hook Chain → Executor → Stream Hooks → Output
              ↑                                          ↓
              └──────────── Interventions ←──────────────┘
```

## Core Concepts

### 1. HookOrchestrator - The Central Hub

All execution flows through the HookOrchestrator, which manages:
- Request validation
- Executor selection
- Stream processing
- Intervention injection
- Parallel coordination

### 2. Hook Events

```typescript
enum HookEvent {
  REQUEST_RECEIVED,      // Validate/modify/redirect requests
  EXECUTION_STARTED,     // Setup monitoring
  EXECUTION_STREAM,      // Process output in real-time
  EXECUTION_INTERVENTION,// Inject corrections
  EXECUTION_COMPLETED,   // Finalize results
  PARALLEL_SPAWN,        // Coordinate parallel execution
  PARALLEL_MERGE         // Merge results
}
```

### 3. Built-in Hooks

1. **Validation Hook** - Ensures concrete deliverables
2. **Verbose Monitor Hook** - Real-time colored output
3. **Intervention Hook** - Pattern detection and correction
4. **Parallel Execution Hook** - Spawns multiple approaches
5. **WebSocket Monitor Hook** - Live web dashboard

## Quick Start

### Build v4
```bash
npm install
npx tsc -p tsconfig.v4.json
```

### Test with MCP Inspector
```bash
npx @modelcontextprotocol/inspector dist-v4/index.js
```

### Basic Usage
```javascript
// Simple execution
axiom_spawn({
  prompt: "Create auth.ts with JWT authentication"
})

// Verbose mode
axiom_spawn({
  prompt: "Implement user registration",
  verboseMasterMode: true
})

// Parallel execution
axiom_spawn({
  prompt: "Create a REST API",
  spawnPattern: "parallel",
  spawnCount: 3,
  verboseMasterMode: true
})
```

## Hook Development

### Creating a Custom Hook

```typescript
import { Hook, HookContext, HookResult, HookEvent } from '../core/hook-orchestrator.js';

export const myCustomHook: Hook = {
  name: 'my-custom-hook',
  events: [HookEvent.EXECUTION_STREAM],
  priority: 75, // Higher = runs first
  
  handler: async (context: HookContext): Promise<HookResult> => {
    const { stream } = context;
    
    // Detect pattern
    if (stream?.data.includes('specific pattern')) {
      // Inject intervention
      return {
        action: 'modify',
        modifications: {
          command: 'echo "Intervention!"\n'
        }
      };
    }
    
    return { action: 'continue' };
  }
};
```

### Hook Actions

- `continue` - Proceed normally
- `block` - Stop execution with reason
- `modify` - Change args/results/inject commands
- `redirect` - Route to different tool

## Real-Time Monitoring

### WebSocket Dashboard

Connect to `ws://localhost:8080` to receive real-time events:

```json
{
  "type": "EXECUTION_STREAM",
  "timestamp": "2025-01-07T12:00:00Z",
  "taskId": "task-123",
  "data": {
    "stream": "Creating auth.ts...\n",
    "source": "task-123"
  }
}
```

### Verbose Mode Output

When `verboseMasterMode: true`:

```
[abc12345] Creating express server...
[def67890] Setting up authentication...
[abc12345] [INTERVENTION] Stop planning! Create server.js now!
[def67890] File created: auth.js
```

## Architecture Benefits

### 1. Complete Observability
Every action flows through hooks, providing total visibility.

### 2. Dynamic Behavior
Hooks can modify execution in real-time based on patterns.

### 3. No Orphaned Components
All components connect through hook events, not hardcoded.

### 4. Extensibility
Add new behaviors by adding hooks, not modifying core.

### 5. Testability
Mock hooks for testing, not entire systems.

## Comparison: v3 vs v4

| Feature | v3 | v4 |
|---------|----|----|
| Architecture | Component-based | Hook-based |
| Verbose Mode | Hardcoded flag | VerboseMonitorHook |
| Interventions | Built into executor | InterventionHook |
| Parallel Execution | Separate system | ParallelExecutionHook |
| WebSocket | Orphaned component | WebSocketMonitorHook |
| Extensibility | Modify core code | Add hooks |

## Future Possibilities

### Advanced Hooks

1. **Performance Hook** - Track execution metrics
2. **Security Hook** - Validate safe operations
3. **Learning Hook** - Adapt based on history
4. **Collaboration Hook** - Multi-user support

### Hook Marketplace

Share and discover hooks:
```typescript
import securityHook from '@axiom/security-hook';
import performanceHook from '@axiom/performance-hook';

orchestrator.registerHook(securityHook);
orchestrator.registerHook(performanceHook);
```

## Migration from v3

1. Tools remain the same (axiom_spawn)
2. Behavior enhanced through hooks
3. All v3 features available via hooks
4. No breaking changes for users

## The Philosophy

> "In v4, hooks aren't just observers - they're the architecture. Every capability is a hook. Every behavior is modifiable. Every execution is observable."

Start with v4 and experience the power of hook-first design!