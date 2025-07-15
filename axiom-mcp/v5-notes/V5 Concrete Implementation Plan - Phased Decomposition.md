# V5 Concrete Implementation Plan - Phased Decomposition

## Executive Summary

V5 revolutionizes Axiom by applying decomposition to Claude's THINKING PROCESS, not just tasks. By controlling tool access per phase, we force productive behavior.

## Core Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  RESEARCH   │ --> │  PLANNING   │ --> │ EXECUTION   │ --> │INTEGRATION │
│ (3 min max) │     │ (3 min max) │     │(10 min max) │     │ (3 min max) │
│             │     │             │     │             │     │             │
│Tools: Read, │     │Tools: Read  │     │Tools: Write │     │Tools: Read,│
│Search, Grep │     │findings only│     │    ONLY     │     │Write final │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

## Phase Definitions

### Phase 1: Research (3 minutes)
**Purpose**: Gather information without commitment
**Tools Available**: 
- `grep` - Search codebase
- `read` - Examine files
- `find` - Locate patterns
- `analyze` - Understand structure

**Output**: `research-findings.md`
**Intervention**: Kill if no findings after 2 minutes

### Phase 2: Planning (3 minutes)
**Purpose**: Make decisions based on research
**Tools Available**:
- `read research-findings.md` - ONLY this file
- `nova_memory` - Store decisions

**Output**: `task-plan.json` with orthogonal tasks
**Intervention**: Force decision if cycling

### Phase 3: Execution (10 minutes)
**Purpose**: Pure implementation
**Tools Available**:
- `write` - Create files
- `mkdir` - Create directories
- NO READING, NO SEARCHING

**Output**: Actual files
**Intervention**: Kill if no files after 5 minutes

### Phase 4: Integration (3 minutes)
**Purpose**: Combine and polish
**Tools Available**:
- `read` - Read created files
- `write` - Create final integrated version

**Output**: Complete implementation

## Example: "Build a REST API with authentication"

### Phase 1 Research Output:
```markdown
# Research Findings
- Project uses Express.js
- Existing auth middleware at middleware/auth.js
- API routes follow /api/v1/* pattern
- Tests use Jest
- TypeScript configuration present
```

### Phase 2 Planning Output:
```json
{
  "tasks": [
    {
      "id": "models",
      "prompt": "Create User model with email/password in models/user.ts",
      "expectedFiles": ["models/user.ts"]
    },
    {
      "id": "auth-routes",
      "prompt": "Create login/register routes in routes/auth.ts",
      "expectedFiles": ["routes/auth.ts"]
    },
    {
      "id": "middleware",
      "prompt": "Create JWT middleware in middleware/jwt.ts",
      "expectedFiles": ["middleware/jwt.ts"]
    },
    {
      "id": "tests",
      "prompt": "Create auth tests in tests/auth.test.ts",
      "expectedFiles": ["tests/auth.test.ts"]
    }
  ]
}
```

### Phase 3 Execution:
- 4 parallel Claude instances
- Each gets ONE task from plan
- NO access to read anything
- Must create from scratch
- 10 minute deadline

### Phase 4 Integration:
- Reads all created files
- Creates `index.ts` tying everything together
- Adds any missing imports/exports

## Implementation Components

### 1. Phase Controller
```typescript
class PhaseController {
  private currentPhase: Phase = 'research';
  private phaseTimeout: NodeJS.Timeout;
  
  async executePhase(phase: Phase, input: string): Promise<string> {
    const tools = this.getPhaseTools(phase);
    const timeout = this.getPhaseTimeout(phase);
    
    const instance = await this.spawnClaude({
      prompt: this.getPhasePrompt(phase, input),
      tools: tools,
      workspace: `/tmp/axiom-${phase}-${Date.now()}`
    });
    
    return this.monitorPhase(instance, phase, timeout);
  }
}
```

### 2. Tool Access Manager
```typescript
class ToolAccessManager {
  enforcePhaseTools(phase: Phase, requestedTool: string): boolean {
    const allowedTools = {
      research: ['grep', 'read', 'find', 'analyze'],
      planning: ['read_findings', 'nova_memory'],
      execution: ['write', 'mkdir'],
      integration: ['read', 'write']
    };
    
    return allowedTools[phase].includes(requestedTool);
  }
}
```

### 3. Thought Stream Monitor
```typescript
class ThoughtMonitor {
  detectBadPatterns(output: string, phase: Phase): Intervention | null {
    if (phase === 'execution') {
      if (output.includes('I would') || output.includes('Let me check')) {
        return { type: 'FORCE_CREATION', message: 'Stop thinking! Create the file NOW!' };
      }
    }
    
    if (phase === 'research' && this.researchLooping(output)) {
      return { type: 'END_RESEARCH', message: 'Enough research! Move to planning!' };
    }
    
    return null;
  }
}
```

### 4. Orthogonal Executor
```typescript
class OrthogonalExecutor {
  async executeTasks(tasks: Task[]): Promise<Map<string, string>> {
    const executions = tasks.map(task => ({
      id: task.id,
      instance: this.spawnExecutor(task),
      workspace: `/tmp/axiom-exec-${task.id}`
    }));
    
    // All run in parallel, no shared state
    const results = await Promise.all(
      executions.map(e => this.waitForFiles(e))
    );
    
    return this.mergeResults(results);
  }
}
```

## Success Metrics

1. **Research Phase**: Findings document created < 3 min
2. **Planning Phase**: Valid task plan < 3 min
3. **Execution Phase**: All expected files created < 10 min
4. **Integration Phase**: Working system < 3 min

Total: Working implementation in < 19 minutes

## Key Innovations

1. **Tool Starvation**: Executors can't research, must create
2. **Phase Isolation**: No context bleeding between phases
3. **Parallel Thoughts**: Multiple reasoning paths explored
4. **Observable Decisions**: Monitor planning phase closely
5. **Forced Progress**: Hard timeouts prevent loops

## This is V5

By decomposing THOUGHTS into phases with controlled tool access, we've created a system that:
- Prevents analysis paralysis
- Forces implementation
- Enables true parallelism
- Maintains quality through research
- Completes in predictable time

The game bot analogy is complete: we control the moves (tools), the clock (timeouts), and the board (workspaces).