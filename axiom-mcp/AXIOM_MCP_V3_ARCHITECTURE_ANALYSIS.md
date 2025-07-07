# Axiom MCP v3 Architecture Analysis

## Executive Summary

Axiom MCP v3 is an ambitious Model Context Protocol (MCP) server designed to transform AI code generation from passive planning to active parallel execution with real-time observation and intervention. The system combines multiple advanced concepts including PTY execution, Monte Carlo Tree Search (MCTS), real-time stream monitoring, and universal coding principles enforcement.

## Core Architecture Components

### 1. MCP Server Layer (`src-v3/index.ts`)
- **Purpose**: Exposes tools to Claude via Model Context Protocol
- **Key Tools**:
  - `axiom_mcp_spawn`: Main task execution with subtask spawning
  - `axiom_mcp_spawn_mcts`: MCTS-guided task exploration
  - `axiom_mcp_observe`: Observability into system state
  - `axiom_mcp_principles`: Universal principles management
  - Plus 15+ additional tools for various operations
- **Integration**: Combines v1 MCP tools with v3 execution infrastructure

### 2. Execution Layer

#### PTY Executor (`src-v3/executors/pty-executor.ts`)
- **Purpose**: Prevents 30-second timeout issues using pseudo-terminal
- **Key Features**:
  - Character-by-character output streaming
  - Heartbeat mechanism to keep connections alive
  - Real-time intervention capability via stdin injection
  - Integration with monitoring pipeline

#### SDK Executor (`src-v3/executors/sdk-executor.ts`)
- Alternative execution method using SDK directly

#### Guided Executor (`src-v3/executors/guided-executor.ts`)
- Execution with guidance and constraints

### 3. Observability Infrastructure

#### Database Layer (`src-v3/database/conversation-db.ts`)
- **SQLite-based** persistence with WAL mode
- **Schema**:
  - `conversations`: Task hierarchies and metadata
  - `actions`: Discrete events (file creation, errors, etc.)
  - `streams`: Raw output chunks with parsed data
  - `observation_views`: Custom filtered views
  - `interventions`: Rule violations and corrections

#### Stream Parser (`src-v3/parsers/stream-parser.ts`)
- Extracts structured events from raw output
- Detects file operations, errors, code blocks
- Enables real-time pattern matching

#### Rule Verifier (`src-v3/verifiers/rule-verifier.ts`)
- Enforces universal principles during execution
- Real-time violation detection
- Intervention trigger mechanism

### 4. Universal Principles System (`src-v3/principles/universal-principles.ts`)

**Coding Principles**:
- **No Orphaned Files**: Update existing docs, don't create random files
- **No Mocks Ever**: Real execution only, no fake data
- **Real Execution Only**: Every operation must have real side effects
- **Verify Don't Trust**: Always check operations succeeded
- **No TODOs**: Implement fully or not at all
- **Observable Operations**: Every action must produce observable output

**Thinking Principles**:
- **Temporal Awareness**: Always know current time, check file timestamps
- **Fail Fast and Loudly**: Clear errors immediately
- **Concrete Over Abstract**: Specific implementations over abstractions
- **Measure Don't Guess**: Base decisions on measurements
- **Explicit Over Implicit**: Clear intentions and behaviors

### 5. Monitoring & Intervention

#### Interactive Controller (`src-v3/monitors/interactive-controller.ts`)
- Real-time monitoring of execution streams
- Rule-based intervention system
- Three intervention types implemented:
  - 30-second planning timeout
  - TODO violation detection
  - 10-second progress checks

#### Stream Interceptor (`src-v3/monitors/stream-interceptor.ts`)
- Pipeline for processing output streams
- Violation detection and intervention injection

#### Rule Engine (`src-v3/monitors/rule-engine.ts`)
- Configurable rules for pattern detection
- Intervention strategy selection

### 6. Task Management

#### Master Controller (`src-v3/core/master-controller.ts`)
- Orchestrates parallel task execution
- Worker thread management
- Resource allocation

#### Priority Queue (`src-v3/core/priority-queue.ts`)
- Task scheduling based on priority
- MCTS integration for dynamic prioritization

#### Event Bus (`src-v3/core/event-bus.ts`)
- Central communication hub
- Async event distribution

### 7. Configuration System

#### Prompt Configuration (`src-v3/config/prompt-config.ts`)
- Task-aware prompts (research vs implementation)
- Framework-specific prompts
- User-customizable via JSON

#### Task Types (`src-v3/config/task-types.ts`)
- Automatic task classification
- Context-appropriate system prompts

### 8. Logging & Debugging

#### Event Logger (`src-v3/logging/event-logger.ts`)
- JSONL format for structured logging
- Timestamped event streams
- Debugging and audit trails

#### WebSocket Server (`src-v3/server/websocket-server.ts`)
- Real-time monitoring interface
- Live stream observation

## Key Discoveries & Issues

### 1. **Critical Architecture Gap**
The system has all components built but they're not fully connected. The PTY executor captures output, the stream parser detects violations, but real-time intervention during execution was missing until recently (fixed Jan 6, 2025).

### 2. **Execution Bottleneck**
Claude CLI doesn't execute commands directly when called through subprocess, leading to the "eternal research mode" problem. The system decomposes tasks but produces empty outputs.

### 3. **Intervention System Status**
As of Jan 6, 2025, real-time intervention is now connected:
- Violations are detected in real-time
- Interventions are written via `executor.write()`
- Three intervention types are working

### 4. **Next Critical Issue: Silent Child Execution**
Child tasks execute silently with no visibility:
- Blocking execution prevents parallel work
- No streaming of child output
- Can't see interventions happening
- Solution planned: Verbose Master Mode with stream aggregation

## Architecture Strengths

1. **Comprehensive Observability**: Every action is logged, parsed, and stored
2. **Principle-Based Design**: Universal principles guide all execution
3. **Parallel Architecture**: Designed for multiple simultaneous executions
4. **Real-Time Capability**: Character-by-character monitoring enables immediate intervention
5. **Extensible Tool System**: Easy to add new MCP tools

## Architecture Weaknesses

1. **Component Integration**: Parts exist but aren't fully wired together
2. **Silent Execution**: Child processes run without visibility
3. **Blocking Operations**: Can't continue work while children execute
4. **Complex Debugging**: Multiple layers make troubleshooting difficult

## Testing Infrastructure

The system includes comprehensive tests:
- **Baseline tests**: Verify expert specification compliance
- **Integration tests**: Full system workflow testing
- **WebSocket tests**: Real-time communication
- **Worker thread tests**: Parallel execution
- **Event streaming tests**: Observability verification

## Build System

- **TypeScript**: Strict typing throughout (v3 uses looser config)
- **Dual build**: Separate configs for v1 and v3
- **ES modules**: Modern module system
- **Source maps**: Full debugging support

## Future Vision

The architecture is designed to support:
1. **Parallel Worktree Execution**: Multiple git worktrees for experimentation
2. **MCTS Optimization**: Dynamic resource allocation to promising paths
3. **Cross-Model Integration**: Gemini, ChatGPT for second opinions
4. **Web Monitoring Dashboard**: Real-time execution visualization
5. **Success Pattern Learning**: Extraction and propagation of working patterns

## Conclusion

Axiom MCP v3 represents a paradigm shift in AI code generation - from planning to observable parallel execution. While the architecture is sophisticated and well-designed, the key challenge remains ensuring all components work together to deliver on the vision of forcing real implementation through observation and intervention.