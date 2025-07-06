# Axiom MCP v3 Technical Design: Observation & Intervention Architecture

## System Overview

Axiom v3 transforms from a task planner into a **real-time execution observatory** that monitors, guides, and optimizes multiple parallel implementation attempts.

## Core Components

### 1. Stream Observation Layer

#### StreamObserver Class
```
Responsibilities:
- Capture character-by-character output from PTY
- Timestamp every chunk with microsecond precision
- Maintain sliding window buffer (last 10KB)
- Detect patterns in real-time
- Emit events for rule engine
```

#### Multi-Stream Aggregator
```
Responsibilities:
- Manage 1-100 concurrent streams
- Correlate patterns across streams
- Detect convergence/divergence
- Load balance observation resources
- Maintain global execution state
```

### 2. Pattern Detection Engine

#### Pattern Types
```
1. Syntax Patterns
   - Code blocks (```language)
   - Import statements
   - Function definitions
   - Error stack traces

2. Semantic Patterns
   - "Researching..." → Research mode detected
   - "TODO" → Incomplete implementation
   - "Would implement" → Hypothetical mode
   - "Error:" → Failure state

3. Behavioral Patterns
   - No output for 30s → Stuck
   - Repeated errors → Wrong approach
   - Rapid file creation → Good progress
   - Test failures → Need intervention

4. Cross-Stream Patterns
   - Multiple streams hit same error
   - Similar solutions emerging
   - Divergent approaches
   - Performance differences
```

### 3. Rule Engine Architecture

#### Rule Definition Structure
```typescript
interface InterventionRule {
  id: string;
  name: string;
  priority: number; // 1-100
  
  // Pattern matching
  trigger: {
    pattern: RegExp | PatternFunction;
    streamFilter?: StreamMatcher;
    timeWindow?: Duration;
    minOccurrences?: number;
  };
  
  // Intervention action
  action: {
    type: 'inject' | 'stop' | 'redirect' | 'amplify';
    message?: string;
    command?: string;
    resourceAdjustment?: number;
  };
  
  // Learning
  effectiveness: {
    successCount: number;
    failureCount: number;
    avgTimeToResolve: number;
  };
}
```

#### Rule Categories

**Category 1: Quality Enforcement**
```
Rules:
- NoPlaceholders: /TODO|FIXME|XXX/ → "Implement now"
- TestFirst: /function.*{/ without prior /test|spec/ → "Write test first"
- ErrorHandling: /catch.*console.log/ → "Proper error handling required"
```

**Category 2: Performance Optimization**
```
Rules:
- SlowQuery: /Query took \d{4,}ms/ → "Add index or optimize"
- N+1 Query: Multiple similar queries → "Use batch loading"
- Memory Leak: Heap growth pattern → "Check for retention"
```

**Category 3: Progress Acceleration**
```
Rules:
- QuickWin: First test passes → "Excellent! Create 5 more similar tests"
- Momentum: 3 successful operations → "Keep going, add feature Y"
- Breakthrough: Complex problem solved → "Document approach, apply elsewhere"
```

### 4. MCTS Integration Layer

#### Dynamic Scoring Function
```typescript
interface StreamScore {
  streamId: string;
  timestamp: number;
  
  metrics: {
    linesOfCode: number;
    testsWritten: number;
    testsPassing: number;
    filesCreated: number;
    errorsResolved: number;
    timeStuck: number;
  };
  
  velocity: {
    codeRate: number;  // lines/minute
    testRate: number;  // tests/minute
    errorRate: number; // errors/minute
  };
  
  quality: {
    complexity: number;
    coverage: number;
    duplication: number;
  };
  
  totalScore: number; // Weighted combination
}
```

#### Resource Allocation Strategy
```
Every 30 seconds:
1. Score all active streams
2. Rank by score and velocity
3. Allocate resources:
   - Top 20%: +2 CPU cores, +4GB RAM
   - Middle 60%: Maintain current
   - Bottom 20%: -1 CPU core, consider stopping
4. Launch new experiments in freed resources
```

### 5. Git Worktree Orchestrator

#### Worktree Manager
```
Responsibilities:
- Create isolated worktrees for each approach
- Manage branch naming (approach-1, approach-2, etc)
- Handle resource allocation per worktree
- Coordinate merges of successful approaches
- Clean up failed experiments
```

#### Parallel Execution Strategy
```
1. Create N worktrees for N approaches
2. Launch PTY executor in each worktree
3. Monitor all streams simultaneously
4. Cherry-pick successful changes
5. Merge best solutions to main
```

### 6. Intervention Injection System

#### Injection Mechanisms
```
1. PTY Input Injection
   - Send keystrokes directly to terminal
   - Ctrl+C to interrupt
   - Paste commands or code

2. File System Injection
   - Create/modify files directly
   - Add missing tests
   - Fix syntax errors

3. Environment Injection
   - Modify environment variables
   - Change system prompts
   - Adjust resource limits

4. Stream Redirection
   - Pipe output to different handler
   - Route errors to debugger
   - Merge streams for collaboration
```

### 7. Success Amplification System

#### Amplification Strategies
```
1. Pattern Extraction
   - Identify what made solution work
   - Extract reusable patterns
   - Create templates

2. Broadcast Success
   - Share working solution to other streams
   - Adapt to different contexts
   - Measure adoption success

3. Resource Boost
   - Allocate more resources to successful streams
   - Clone successful stream with variations
   - Accelerate similar approaches

4. Documentation Generation
   - Auto-document successful patterns
   - Create runbooks
   - Build pattern library
```

## Data Flow Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  PTY Executors  │────▶│ Stream Observers │────▶│ Pattern Matcher │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                           │
                        ┌──────────────────┐               │
                        │   Event Bus      │◀──────────────┘
                        └────────┬─────────┘
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     │                           │                           │
┌────▼─────┐          ┌─────────▼────────┐      ┌──────────▼────────┐
│Rule Engine│         │ MCTS Optimizer   │      │ Worktree Manager  │
└────┬─────┘          └─────────┬────────┘      └──────────┬────────┘
     │                          │                           │
┌────▼─────────────────────────▼───────────────────────────▼────────┐
│                     Intervention Coordinator                       │
└────────────────────────────────────────────────────────────────────┘
```

## Event System Design

### Event Types
```typescript
enum EventType {
  // Stream Events
  STREAM_OUTPUT = 'stream.output',
  STREAM_ERROR = 'stream.error',
  STREAM_COMPLETE = 'stream.complete',
  
  // Pattern Events  
  PATTERN_DETECTED = 'pattern.detected',
  PATTERN_RESOLVED = 'pattern.resolved',
  
  // Rule Events
  RULE_TRIGGERED = 'rule.triggered',
  RULE_SUCCESS = 'rule.success',
  RULE_FAILURE = 'rule.failure',
  
  // Intervention Events
  INTERVENTION_SENT = 'intervention.sent',
  INTERVENTION_ACKNOWLEDGED = 'intervention.acknowledged',
  
  // System Events
  RESOURCE_ALLOCATED = 'resource.allocated',
  WORKTREE_CREATED = 'worktree.created',
  MERGE_COMPLETED = 'merge.completed'
}
```

### Event Bus Features
- Pub/sub with pattern matching
- Event replay capability
- Persistence to JSONL
- Real-time WebSocket streaming
- Event correlation IDs
- Microsecond timestamps

## Performance Considerations

### Stream Processing
- Use ring buffers for stream data
- Process patterns in separate thread
- Batch events for efficiency
- Compress historical data

### Resource Management
- CPU/Memory limits per stream
- Automatic cleanup of dead streams
- Resource pooling for efficiency
- Graceful degradation under load

### Storage Strategy
- Hot storage: Last 1 hour in memory
- Warm storage: Last 24 hours on SSD
- Cold storage: Compressed archives
- Searchable event index

## Security & Isolation

### Stream Isolation
- Each stream in separate process
- Resource limits enforced
- No shared file system access
- Network isolation optional

### Intervention Safety
- Validate all injected commands
- Sanitize file paths
- Rate limit interventions
- Audit all actions

## Monitoring & Debugging

### Real-time Dashboards
- Stream health monitors
- Pattern detection rates
- Rule effectiveness metrics
- Resource utilization graphs

### Debug Capabilities
- Stream replay from any point
- Rule testing framework
- Pattern matching debugger
- Intervention simulator

## Integration Points

### MCP Protocol
- Expose observations as resources
- Stream events as notifications
- Intervention tools
- Configuration via prompts

### External Systems
- Webhook notifications
- Metrics exporters (Prometheus)
- Log aggregation (ELK)
- CI/CD integration

## Failure Handling

### Stream Failures
- Automatic restart with backoff
- Error pattern learning
- Resource reallocation
- Graceful degradation

### System Failures
- Event bus persistence
- Stream checkpoint/restore
- Rule state preservation
- Automatic recovery

## Future Extensibility

### Plugin Architecture
- Custom pattern matchers
- External rule sources
- Third-party interventions
- Analysis plugins

### Machine Learning
- Pattern learning from history
- Rule effectiveness optimization
- Anomaly detection
- Predictive interventions

This technical design provides the blueprint for transforming Axiom MCP from a planning system into a true execution observatory that can observe, learn, and intervene in real-time across multiple parallel attempts.