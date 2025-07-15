# Axiom V4 Unified Architecture

## Executive Summary

Merging V5's best innovations into V4 to create a single, powerful system that combines:
- V4's proven PTY execution and monitoring
- V5's phase-based execution strategy
- V5's aggressive instance management
- V5's tool restriction concepts

## Key Innovations from V5 Worth Keeping

### 1. **Phase-Based Execution** (Optional Mode)
```typescript
axiom_spawn({
  prompt: "Build authentication system",
  executionMode: "phased",  // NEW: opt-in to phases
  phases: {
    research: { duration: 3, tools: ["read", "grep"] },
    planning: { duration: 2, tools: ["read"] },
    execution: { duration: 10, tools: ["write", "create"] },
    integration: { duration: 3, tools: ["all"] }
  }
})
```

### 2. **Aggressive Instance Management**
```typescript
// Add to V4's monitoring
const instanceMonitor = {
  productivityThreshold: 30, // seconds without file creation
  autoKill: true,
  warningAt: 20 // warn at 20 seconds
};
```

### 3. **Tool Restriction Per Task**
```typescript
axiom_spawn({
  prompt: "Create API documentation",
  restrictedTools: ["claude", "chatgpt"], // Block recursive AI calls
  allowedTools: ["write", "read", "grep"]  // Whitelist approach
})
```

## Unified V4 Architecture

### Core Tools (Keep V4's 6 tools)
1. `axiom_spawn` - Enhanced with optional phases
2. `axiom_send` - Unchanged
3. `axiom_status` - Add productivity metrics
4. `axiom_output` - Unchanged
5. `axiom_interrupt` - Add auto-kill support
6. `axiom_claude_orchestrate` - Enhanced steering

### New Parameters for axiom_spawn
```typescript
interface EnhancedSpawnParams {
  prompt: string;
  
  // Existing V4
  spawnPattern?: "single" | "parallel" | "decompose";
  spawnCount?: number;
  verboseMasterMode?: boolean;
  
  // NEW from V5
  executionMode?: "direct" | "phased";  // Default: direct
  phases?: PhaseConfig;                  // Only if phased
  aggressiveness?: number;               // 0-1, productivity enforcement
  toolRestrictions?: {
    allowed?: string[];
    forbidden?: string[];
  };
  autoKillTimeout?: number;              // Seconds before killing unproductive
}
```

### Implementation Plan

#### Step 1: Add Phase Support to V4 (Optional)
```typescript
// In axiom-mcp-spawn.ts
if (args.executionMode === "phased") {
  return executePhased(args);
} else {
  return executeDirect(args); // Current V4 behavior
}
```

#### Step 2: Add Productivity Monitoring
```typescript
// In task-monitor-hook.ts
class ProductivityMonitor {
  constructor(private threshold: number = 30) {}
  
  checkProductivity(task: Task): boolean {
    const timeSinceLastFile = Date.now() - task.lastFileCreated;
    if (timeSinceLastFile > this.threshold * 1000) {
      this.emit('unproductive', task);
      if (task.autoKill) {
        task.interrupt("Killed: No files created in 30s");
      }
    }
  }
}
```

#### Step 3: Tool Restrictions
```typescript
// In hook-orchestrator.ts
async restrictTools(taskId: string, restrictions: ToolRestrictions) {
  // Intercept tool calls and block forbidden ones
  this.toolFilters.set(taskId, restrictions);
}
```

## Migration Path

### 1. Archive V5
```bash
# Move V5 to archive
mv src-v5 archive/v5-shadow-protocol
mv dist-v5 archive/v5-shadow-protocol-dist

# Document lessons learned
cp docs/AXIOM_V5_*.md archive/v5-shadow-protocol/
```

### 2. Update V4
```bash
# Add new features to V4
npm run build:v4
npm test
```

### 3. Single MCP Config
```json
{
  "axiom-mcp": {
    "command": "node",
    "args": ["/home/peter/nova-mcp/axiom-mcp/dist-v4/index.js"],
    "description": "Axiom MCP - Unified task orchestration with optional phases"
  }
}
```

## Benefits of Unification

1. **Single architecture** - Easier to maintain
2. **Backward compatible** - V4 tools work unchanged
3. **Opt-in complexity** - Phases only when needed
4. **Best of both** - V4 stability + V5 innovations
5. **Clear upgrade path** - Users can gradually adopt new features

## What We're NOT Keeping from V5

1. **Separate server** - Everything in V4
2. **"Shadow protocol" branding** - Too edgy
3. **Glitch system** - Unnecessary complexity
4. **Forced phases** - Make it optional
5. **Separate tool names** - Use parameters instead

## Final V4 Tool Examples

### Basic (unchanged)
```typescript
axiom_spawn({ prompt: "Create auth.ts" })
```

### With Phases (new)
```typescript
axiom_spawn({
  prompt: "Build complete auth system",
  executionMode: "phased",
  aggressiveness: 0.8
})
```

### With Restrictions (new)
```typescript
axiom_spawn({
  prompt: "Document the API",
  toolRestrictions: {
    forbidden: ["claude", "rm", "delete"],
    allowed: ["write", "read", "mkdir"]
  }
})
```

## Next Steps

1. ✅ Document unified architecture
2. 🔲 Implement phase support in V4
3. 🔲 Add productivity monitoring
4. 🔲 Add tool restrictions
5. 🔲 Archive V5
6. 🔲 Update documentation
7. 🔲 Test unified system