# Axiom MCP v3: Technical Reference Guide
## Multi-Agent Systems Architecture (June/July 2025 Research)

### Table of Contents
1. [Executive Summary](#executive-summary)
2. [Theoretical Foundation](#theoretical-foundation)
3. [Multi-Agent Architecture](#multi-agent-architecture)
4. [Communication Patterns](#communication-patterns)
5. [Execution Models](#execution-models)
6. [Verification Systems](#verification-systems)
7. [Stream Processing](#stream-processing)
8. [Intervention Mechanisms](#intervention-mechanisms)
9. [State Management](#state-management)
10. [Future Directions](#future-directions)

---

## Executive Summary

Axiom MCP v3 represents an ambitious attempt to implement a **Multi-Agent Parallel Execution Observatory** using state-of-the-art techniques from June/July 2025 research. The system combines:

- **Monte Carlo Tree Search (MCTS)** for intelligent task exploration
- **Master-Worker Thread Architecture** for parallel execution
- **Port Graph Communication** for inter-agent messaging
- **Real-Time Stream Processing** with intervention capabilities
- **Verification-Driven Development** with mandatory proof of execution

**Current Implementation Status**: ~20% complete (updated from 15% after SDK integration)

---

## Theoretical Foundation

### Core Philosophy: "Exploration AND Exploitation"

The system is built on the recognition that AI code generation suffers from two failure modes:
1. **Over-Planning**: Endless research without implementation
2. **Blind Execution**: Implementation without understanding

Axiom MCP v3 solves this through:
- **Parallel Exploration**: Multiple approaches tried simultaneously
- **Observable Execution**: Real-time monitoring of all attempts
- **Intelligent Intervention**: Course correction based on patterns
- **Success Synthesis**: Merging best elements from all paths

### Mathematical Model: MCTS with Verification

The system implements UCB1 (Upper Confidence Bound) formula:
```
UCB1 = Q(n)/N(n) + C * sqrt(ln(N(parent))/N(n))
```

Where:
- `Q(n)` = Total reward (based on ACTUAL file creation)
- `N(n)` = Visit count
- `C` = Exploration constant (tuned for code generation)

**Key Innovation**: Rewards based on filesystem verification, not LLM claims

---

## Multi-Agent Architecture

### 1. Master Controller Pattern

```
┌─────────────────────────────────────────────┐
│            Master Controller                 │
│  ┌─────────────────────────────────────┐   │
│  │         Port Graph Manager           │   │
│  │    (Inter-agent communication)       │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │         Worker Thread Pool           │   │
│  │    (Parallel task execution)         │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │          Event Bus (JSONL)           │   │
│  │    (Centralized event ledger)        │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Implementation**: `src-v3/core/master-controller.ts`

#### Key Responsibilities:
- **Task Queue Management**: FIFO with priority override
- **Worker Allocation**: Dynamic scaling based on load
- **Port Assignment**: Unique ports for each agent
- **Event Aggregation**: Central collection point

### 2. Worker Thread Architecture

Each worker thread (`src-v3/workers/claude-worker.ts`):
- Manages single Claude subprocess in PTY
- Monitors output stream character-by-character
- Applies real-time interventions
- Reports events to master via `parentPort`

**Critical Discovery**: Must use PTY, not regular pipes:
```typescript
// WRONG: Regular spawn fails with interactive tools
const child = spawn('claude', args);

// CORRECT: PTY enables proper interaction
const ptyProcess = pty.spawn('claude', args, {
  name: 'xterm-color',
  cols: 80,
  rows: 30
});
```

### 3. Port Graph System

**Concept**: Dynamic graph of communication ports enabling:
- Parent-child hierarchies
- Sibling communication
- Cross-tree messaging
- Broadcast capabilities

**Implementation Status**: 
- ✅ Port allocation logic complete
- ✅ Graph structure maintained
- ❌ Actual messaging not implemented
- ❌ No agent-to-agent communication

---

## Communication Patterns

### 1. Hierarchical Event Propagation

```
Child Worker → Master Controller → Parent Worker
     ↓              ↓                    ↓
  Event Bus    Port Graph           Database
```

Events bubble up through hierarchy with metadata accumulation.

### 2. Message Types

#### Worker → Master
```typescript
{
  type: 'stream' | 'complete' | 'error' | 'intervention',
  workerId: string,
  taskId: string,
  timestamp: number,
  payload: any
}
```

#### Master → Worker
```typescript
{
  type: 'execute' | 'intervene' | 'terminate',
  taskId: string,
  payload: any
}
```

### 3. Tool Invocation Protocol

Special output patterns trigger tool calls:
```
TOOL_INVOCATION: {"tool": "file_write", "params": {...}}
Axiom MCP Spawn Child: {"prompt": "...", "criteria": [...]}
```

**Status**: Pattern defined but parser not connected

---

## Execution Models

### 1. PTY Executor (Primary)

**File**: `src-v3/executors/pty-executor.ts`

**Purpose**: Interactive tasks requiring TTY
- User prompts
- Permission requests
- Real-time feedback

**Features**:
- Character-by-character streaming
- ANSI escape sequence handling
- Signal forwarding (SIGINT, etc.)
- Intervention injection via `write()`

### 2. SDK Executor (Newly Integrated)

**File**: `src-v3/executors/sdk-executor.ts`

**Purpose**: Non-interactive batch processing
- Code generation
- Analysis tasks
- Deterministic operations

**Features**:
- Structured message streaming
- Tool call extraction
- No TTY overhead
- Better for parallelism

### 3. Execution Selection Logic

```typescript
function needsInteractiveExecution(prompt: string): boolean {
  const interactivePatterns = [
    /\b(install|npm install|yarn|pip install)\b/i,
    /\b(permission|sudo|admin)\b/i,
    /\b(login|authenticate)\b/i,
    /\b(server|localhost)\b/i,
  ];
  return interactivePatterns.some(p => p.test(prompt));
}
```

---

## Verification Systems

### 1. Multi-Layer Verification

```
┌─────────────────────────────────────────┐
│          Verification Pipeline           │
├─────────────────────────────────────────┤
│  1. Stream Parser (Real-time events)    │
├─────────────────────────────────────────┤
│  2. Rule Verifier (Principle checks)    │
├─────────────────────────────────────────┤
│  3. Filesystem Verifier (Actual files)  │
├─────────────────────────────────────────┤
│  4. Test Runner (Code validity)         │
├─────────────────────────────────────────┤
│  5. Cross-Model Judge (Optional)        │
└─────────────────────────────────────────┘
```

### 2. Universal Principles Enforcement

**File**: `src-v3/principles/universal-principles.ts`

#### Coding Principles:
1. **No Orphaned Files**: Update existing, don't create random
2. **No Mocks Ever**: Real execution only
3. **No TODOs**: Implement fully or not at all
4. **Verify Don't Trust**: Check every operation
5. **Observable Operations**: All actions must be visible

#### Thinking Principles:
1. **Temporal Awareness**: Always know current time
2. **Fail Fast and Loudly**: Clear errors immediately
3. **Concrete Over Abstract**: Specific implementations
4. **Measure Don't Guess**: Data-driven decisions
5. **Explicit Over Implicit**: Clear intentions

### 3. Verification Metrics

```typescript
interface VerificationResult {
  passed: boolean;
  violations: RuleViolation[];
  metrics: {
    filesCreated: number;
    filesModified: number;
    todosFound: number;
    planningStatements: number;
    codeBlocks: number;
    actualImplementation: boolean;
  };
}
```

---

## Stream Processing

### 1. Stream Parser Architecture

**File**: `src-v3/parsers/stream-parser.ts`

Detects patterns in real-time:
- File creation/modification
- Command execution
- Error occurrence
- Code blocks
- Task lifecycle events

### 2. Event Types

```typescript
type StreamEventType = 
  | 'file_created'      // Creating/writing files
  | 'file_modified'     // Updating files
  | 'command_executed'  // Shell commands
  | 'error_occurred'    // Errors/exceptions
  | 'task_started'      // Task initiation
  | 'task_completed'    // Task completion
  | 'code_block'        // Markdown code blocks
  | 'output_chunk';     // Raw output
```

### 3. Stream Aggregation (Missing Component)

**Planned Architecture**:
```
Multiple Child Streams → Multiplex → Aggregated Stream
                            ↓
                    [CHILD-1] Output...
                    [CHILD-2] Output...
                    [CHILD-3] Output...
```

**Research**: Use `multiplex` npm package for back-pressure handling

---

## Intervention Mechanisms

### 1. Real-Time Intervention System

**Connected**: January 6, 2025, 18:43 EDT

#### Intervention Types:
1. **Planning Timeout** (30 seconds)
   ```
   [INTERVENTION] You have been planning for 30 seconds without creating any files. Stop planning and start implementing now!
   ```

2. **TODO Violation**
   ```
   [INTERVENTION] STOP! Implement this instead of writing TODO
   ```

3. **Progress Check** (10 seconds)
   ```
   [PROGRESS CHECK] No files created yet. Remember to write actual code files, not just descriptions.
   ```

### 2. Intervention Statistics

```typescript
interventionStats = {
  totalInterventions: 0,
  planningTimeouts: 0,
  todoViolations: 0,
  progressChecks: 0,
  successfulFileCreation: 0
}
```

### 3. Intervention Timing Issue

**Current**: Interventions injected into PTY stream
**Problem**: Claude already invoked, sees intervention too late
**Solution**: Pre-prompt modification or SDK message injection

---

## State Management

### 1. Database Schema

**SQLite** with three core tables:

#### Conversations Table
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  parent_id TEXT,              -- Task hierarchy
  started_at TEXT NOT NULL,
  status TEXT NOT NULL,        -- active|completed|failed
  depth INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  task_type TEXT NOT NULL,
  metadata TEXT,               -- JSON
  FOREIGN KEY (parent_id) REFERENCES conversations(id)
);
```

#### Actions Table
```sql
CREATE TABLE actions (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,          -- file_created|error|intervention|etc
  content TEXT NOT NULL,
  metadata TEXT,               -- JSON
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

#### Streams Table
```sql
CREATE TABLE streams (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  chunk TEXT NOT NULL,         -- Raw output
  parsed_data TEXT,            -- JSON events
  timestamp TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

### 2. Status Management

**In-Memory**: `StatusManager` tracks active tasks
**Persistent**: SQLite for historical analysis
**Missing**: State synchronization between memory and disk

---

## Future Directions

### 1. Verbose Master Mode (Priority 1)

**Goal**: Stream all child output in real-time

**Implementation Plan**:
1. Add `verboseMasterMode` flag to schema
2. Create `StreamAggregator` class
3. Use `multiplex` for stream management
4. Non-blocking child execution
5. Prefix output by task

### 2. True Parallelism (Priority 2)

**Goal**: Git worktree isolated experiments

**Components Needed**:
1. Worktree manager
2. Resource allocator
3. Conflict resolver
4. Result synthesizer

### 3. Multi-Tool Integration (Priority 3)

**Planned Tools**:
- **Gemini**: Second opinion model
- **Nova Browser**: Web research
- **Nova Memory**: Knowledge persistence
- **GitHub**: Direct repository manipulation

### 4. Pattern Learning System

**Goal**: Evolve rules based on success

**Components**:
1. Pattern extractor
2. Success classifier
3. Rule generator
4. A/B testing framework

---

## Technical Debt Analysis

### Critical Issues

1. **Stream Aggregation Missing**
   - Impact: Can't see child execution
   - Solution: Implement StreamAggregator

2. **Port Graph Unused**
   - Impact: No agent communication
   - Solution: Message routing system

3. **MCTS Disconnected**
   - Impact: No intelligent path selection
   - Solution: Wire rewards to verification

4. **Worker Threads Underutilized**
   - Impact: No true parallelism
   - Solution: Proper task distribution

### Architecture Misalignments

1. **Execution Model**
   - Designed: Parallel with streaming
   - Actual: Sequential with blocking

2. **Communication Model**
   - Designed: Port-based messaging
   - Actual: No inter-agent communication

3. **Learning Model**
   - Designed: Pattern extraction and evolution
   - Actual: Static rules only

---

## Conclusion

Axiom MCP v3 embodies sophisticated multi-agent system design from 2025 research but suffers from incomplete implementation. The architecture supports:

- Parallel execution with isolation
- Real-time observation and intervention
- Intelligent path selection via MCTS
- Verification-driven development
- Pattern learning and evolution

However, only ~20% is implemented. The immediate priority is making child execution visible through Verbose Master Mode, followed by enabling true parallelism and intelligent routing.

The system represents the future of AI-assisted development: not a single assistant, but an orchestra of specialized agents working in parallel, learning from each other, and synthesizing the best solutions.

---

*Technical Reference Guide Version 1.0*  
*Last Updated: January 7, 2025*  
*Based on June/July 2025 Multi-Agent Research*