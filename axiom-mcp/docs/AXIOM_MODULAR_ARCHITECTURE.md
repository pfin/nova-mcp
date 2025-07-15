# Axiom MCP Modular Architecture

## Overview

Breaking Axiom MCP into modular components for better maintainability, scalability, and reusability.

## Current Monolithic Structure

```
axiom-mcp/
├── src-v4/
│   ├── index.ts              # Everything in one place
│   ├── executors/            # PTY control
│   ├── tools/                # All tools mixed together
│   └── core/                 # Mixed concerns
```

## Proposed Modular Architecture

### Core Modules

```
axiom-core/
├── @axiom/pty-control        # Low-level PTY management
├── @axiom/pattern-engine     # Pattern detection & matching
├── @axiom/intervention       # Intervention system
├── @axiom/orchestrator       # Task orchestration
├── @axiom/monitor           # Real-time monitoring
└── @axiom/commons           # Shared utilities
```

### 1. PTY Control Module (`@axiom/pty-control`)

**Purpose**: Handle all PTY-related operations

```typescript
export interface PtyController {
  spawn(command: string, options: PtyOptions): Promise<PtySession>;
  write(session: PtySession, data: string): void;
  read(session: PtySession): AsyncIterator<string>;
  interrupt(session: PtySession): void;
  kill(session: PtySession): void;
}

export interface PtySession {
  id: string;
  pid: number;
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  output: ReadableStream<string>;
}
```

**Features**:
- Control character processing
- Session management
- Output streaming
- Process lifecycle

### 2. Pattern Engine Module (`@axiom/pattern-engine`)

**Purpose**: Detect patterns in Claude's output

```typescript
export interface Pattern {
  id: string;
  name: string;
  regex?: RegExp;
  detector: (output: string) => boolean;
  priority: number;
  action: PatternAction;
}

export interface PatternEngine {
  registerPattern(pattern: Pattern): void;
  analyze(output: string): DetectedPattern[];
  getRecommendedAction(patterns: DetectedPattern[]): Action;
}
```

**Built-in Patterns**:
- Churning detection (high token count, no output)
- Planning detection ("I'll help you", "Let me explain")
- Error loops
- Success indicators (file creation)
- Trust dialog detection

### 3. Intervention System (`@axiom/intervention`)

**Purpose**: Take action based on detected patterns

```typescript
export interface Intervention {
  type: 'gentle' | 'forceful' | 'kill';
  message?: string;
  controlSequence?: string;
  validator: (response: string) => boolean;
}

export interface InterventionEngine {
  createIntervention(pattern: DetectedPattern): Intervention;
  executeIntervention(session: PtySession, intervention: Intervention): Promise<boolean>;
  scheduleIntervention(session: PtySession, delay: number): void;
}
```

**Intervention Types**:
- Gentle nudge: "Please create the file now"
- Forceful command: "STOP! Create file.py NOW!"
- Control sequences: ESC, Ctrl+C
- Process termination

### 4. Task Orchestrator (`@axiom/orchestrator`)

**Purpose**: Manage multiple Claude instances and tasks

```typescript
export interface Task {
  id: string;
  prompt: string;
  strategy: 'single' | 'parallel' | 'sequential';
  timeout?: number;
  validators: TaskValidator[];
}

export interface Orchestrator {
  spawnTask(task: Task): Promise<TaskExecution>;
  spawnParallel(tasks: Task[]): Promise<TaskExecution[]>;
  monitorExecution(execution: TaskExecution): AsyncIterator<ExecutionUpdate>;
  mergeResults(executions: TaskExecution[]): MergedResult;
}
```

**Orchestration Strategies**:
- Single Claude instance
- Parallel worktrees
- Sequential phases
- MCTS optimization

### 5. Monitor Module (`@axiom/monitor`)

**Purpose**: Real-time monitoring and metrics

```typescript
export interface Monitor {
  trackSession(session: PtySession): void;
  getMetrics(sessionId: string): SessionMetrics;
  detectAnomaly(metrics: SessionMetrics): Anomaly[];
  exportMetrics(): MetricsExport;
}

export interface SessionMetrics {
  tokensGenerated: number;
  filesCreated: number;
  interventionsTriggered: number;
  timeToFirstFile: number;
  churningTime: number;
}
```

### 6. Commons Module (`@axiom/commons`)

**Purpose**: Shared utilities and types

```typescript
export interface Logger {
  debug(module: string, message: string, data?: any): void;
  info(module: string, message: string, data?: any): void;
  warn(module: string, message: string, data?: any): void;
  error(module: string, message: string, error?: Error): void;
}

export interface EventBus {
  emit(event: string, data: any): void;
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
}
```

## Module Integration

### Example: Complete Task Execution

```typescript
import { PtyController } from '@axiom/pty-control';
import { PatternEngine } from '@axiom/pattern-engine';
import { InterventionEngine } from '@axiom/intervention';
import { Monitor } from '@axiom/monitor';

class AxiomExecutor {
  constructor(
    private pty: PtyController,
    private patterns: PatternEngine,
    private interventions: InterventionEngine,
    private monitor: Monitor
  ) {}

  async execute(prompt: string): Promise<ExecutionResult> {
    // Spawn Claude
    const session = await this.pty.spawn('claude', { cwd: process.cwd() });
    
    // Start monitoring
    this.monitor.trackSession(session);
    
    // Process output
    for await (const chunk of this.pty.read(session)) {
      // Detect patterns
      const detected = this.patterns.analyze(chunk);
      
      // Check if intervention needed
      if (detected.some(p => p.requiresIntervention)) {
        const intervention = this.interventions.createIntervention(detected[0]);
        await this.interventions.executeIntervention(session, intervention);
      }
      
      // Stream to user
      yield chunk;
    }
    
    // Get final metrics
    return {
      metrics: this.monitor.getMetrics(session.id),
      output: session.output
    };
  }
}
```

## Benefits of Modular Architecture

### 1. Independent Development
- Each module can be developed and tested independently
- Clear interfaces between modules
- Easier to onboard new developers

### 2. Reusability
- PTY control can be used for other CLI tools
- Pattern engine can analyze any text stream
- Monitor can track any process

### 3. Extensibility
- Easy to add new patterns
- New intervention strategies
- Additional orchestration methods

### 4. Testing
- Unit test each module in isolation
- Mock interfaces for testing
- Clear boundaries for integration tests

### 5. Performance
- Lazy load modules as needed
- Parallel processing in separate workers
- Optimized pattern matching

## Migration Strategy

### Phase 1: Extract Core Modules (Week 1)
1. Extract PTY control into @axiom/pty-control
2. Create clean interfaces
3. Update imports in main package

### Phase 2: Pattern & Intervention (Week 2)
1. Extract pattern detection logic
2. Build intervention engine
3. Create pattern registry

### Phase 3: Orchestration (Week 3)
1. Extract task management
2. Implement parallel execution
3. Add worktree support

### Phase 4: Monitoring & Analytics (Week 4)
1. Build metrics collection
2. Add anomaly detection
3. Create dashboards

## Package Structure

```json
{
  "name": "@axiom/monorepo",
  "workspaces": [
    "packages/pty-control",
    "packages/pattern-engine",
    "packages/intervention",
    "packages/orchestrator",
    "packages/monitor",
    "packages/commons",
    "packages/axiom-mcp"
  ]
}
```

Each package has its own:
- `package.json`
- TypeScript config
- Tests
- Documentation
- Version

## API Design Principles

### 1. Stream-First
All modules work with streams for real-time processing

### 2. Event-Driven
Modules communicate via events, not direct calls

### 3. Pluggable
Easy to swap implementations (e.g., different pattern engines)

### 4. Observable
All operations emit events for monitoring

### 5. Resilient
Graceful degradation when modules fail

## Example: Custom Pattern Module

```typescript
import { Pattern, PatternEngine } from '@axiom/pattern-engine';

// Custom pattern for detecting mock usage
const noMocksPattern: Pattern = {
  id: 'no-mocks',
  name: 'Mock Detection',
  regex: /mock|stub|fake|dummy/i,
  detector: (output) => output.toLowerCase().includes('mock'),
  priority: 100,
  action: {
    type: 'intervention',
    severity: 'high',
    message: 'NO MOCKS! Use real implementations!'
  }
};

// Register with engine
patternEngine.registerPattern(noMocksPattern);
```

## Future Modules

### Advanced Modules (v5+)
- `@axiom/ai-router`: Route tasks to different AI models
- `@axiom/code-analyzer`: Static analysis of generated code
- `@axiom/test-runner`: Automatic test execution
- `@axiom/git-integration`: Automatic commits and PRs
- `@axiom/cloud-sync`: Multi-device synchronization

### Enterprise Modules
- `@axiom/audit`: Compliance and audit logging
- `@axiom/rbac`: Role-based access control
- `@axiom/metrics-export`: Prometheus/Grafana integration
- `@axiom/secrets`: Secure credential management

## Conclusion

Breaking Axiom into modular components will:
1. Improve maintainability
2. Enable parallel development
3. Allow custom configurations
4. Support enterprise features
5. Create a plugin ecosystem

The modular architecture transforms Axiom from a monolithic tool into a flexible platform for AI-driven development.