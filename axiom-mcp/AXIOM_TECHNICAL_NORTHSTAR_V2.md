# Axiom MCP Technical Northstar v2.0

## Executive Summary

Axiom MCP is being rebuilt from the ground up to solve its fundamental flaw: it marks tasks as "completed" without writing any code. This document defines the technical architecture for v2.0, incorporating insights from the Claude Code SDK, state-of-the-art agent research (July 2025), and lessons learned from v1.0.

## Core Architecture Principles

### 1. SDK-First, CLI Fallback
- **Primary**: Use `@anthropic-ai/claude-code` SDK for programmatic control
- **Fallback**: Use CLI with `node-pty` only for interactive sessions requiring TTY
- **Never**: Use `execSync` or basic `spawn` - they cause timeouts and lose output

### 2. Streaming Event Architecture
```typescript
interface StreamingArchitecture {
  eventBus: EventEmitter;          // Central message broker
  ledger: JSONLWriter;             // Append-only event log
  workers: WorkerPool;             // True parallel execution
  verifier: SystemVerification;    // Unhackable proof layer
  monitor: WebSocketServer;        // Real-time observability
}
```

### 3. Verification-Driven Development
Every task MUST produce verifiable artifacts:
- Files exist on disk (not just claimed)
- Tests pass when executed (not just written)
- Coverage meets thresholds (not just reported)
- No security vulnerabilities (scanned, not assumed)

## Technical Components

### 1. Process & Streaming Layer

```typescript
// SDK-based streaming (preferred)
import { query } from "@anthropic-ai/claude-code";

async function* streamClaudeTask(prompt: string, taskId: string) {
  for await (const delta of query({ 
    prompt,
    options: { maxTurns: 10, cwd: `./sandbox/${taskId}` }
  })) {
    yield {
      timestamp: Date.now(),
      taskId,
      event: 'claude_delta',
      payload: delta
    };
  }
}

// PTY-based interactive fallback
import * as pty from 'node-pty';

function createInteractiveSession(taskId: string): IPty {
  const ptyProcess = pty.spawn('claude', ['--dangerously-skip-permissions'], {
    name: 'xterm-color',
    cols: 120,
    rows: 40,
    cwd: `./sandbox/${taskId}`
  });
  
  // Heartbeat to prevent idle timeout
  const heartbeat = setInterval(() => {
    ptyProcess.write('\x00'); // Zero-width char
  }, 180_000); // 3 minutes
  
  return ptyProcess;
}
```

### 2. Worker Pool Architecture

```typescript
import { Worker } from 'worker_threads';

class AxiomWorkerPool {
  private workers: Map<string, Worker> = new Map();
  private queue: TaskQueue;
  
  constructor(private config: {
    minWorkers: number;
    maxWorkers: number;
    taskTimeout: number; // 20 minutes default
  }) {}
  
  async executeTask(task: Task): Promise<TaskResult> {
    const worker = await this.getAvailableWorker();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Task timeout'));
      }, this.config.taskTimeout);
      
      worker.postMessage({ type: 'execute', task });
      
      worker.once('message', (result) => {
        clearTimeout(timeout);
        this.releaseWorker(worker);
        resolve(result);
      });
    });
  }
}
```

### 3. Event Ledger System

```typescript
interface LedgerEvent {
  timestamp: string;      // ISO-8601 with ms precision
  taskId: string;
  parentId?: string;
  workerId: string;
  event: EventType;
  payload: unknown;
  verification?: VerificationResult;
}

enum EventType {
  TASK_START = 'task_start',
  CLAUDE_DELTA = 'claude_delta',
  TOOL_CALL = 'tool_call',
  FILE_CREATED = 'file_created',
  TEST_RUN = 'test_run',
  VERIFICATION_PASS = 'verification_pass',
  VERIFICATION_FAIL = 'verification_fail',
  TASK_COMPLETE = 'task_complete',
  TASK_RETRY = 'task_retry'
}
```

### 4. Verification Pipeline

```typescript
class SystemVerification {
  async verify(task: Task): Promise<VerificationResult> {
    const proof = {
      filesCreated: await this.checkFiles(task),
      testsPass: await this.runTests(task),
      coverageMet: await this.checkCoverage(task),
      noVulnerabilities: await this.securityScan(task),
      actuallyRuns: await this.executeCode(task)
    };
    
    // Task only passes if ALL criteria are met
    const passed = Object.values(proof).every(Boolean);
    
    return {
      passed,
      proof,
      recommendation: passed ? 'accept' : 'retry_with_feedback'
    };
  }
}
```

### 5. Multi-Layer Parent-Child Tracking

```typescript
interface TaskNode {
  id: string;
  parentId?: string;
  depth: number;
  status: TaskStatus;
  children: string[];
  
  // MCTS fields
  visits: number;
  totalReward: number;
  
  // Verification
  verificationAttempts: number;
  lastVerification?: VerificationResult;
}

class TaskDAG {
  private nodes: Map<string, TaskNode> = new Map();
  
  spawnChild(parentId: string, prompt: string): TaskNode {
    const parent = this.nodes.get(parentId);
    const child: TaskNode = {
      id: generateId(),
      parentId,
      depth: parent.depth + 1,
      status: 'queued',
      children: [],
      visits: 0,
      totalReward: 0,
      verificationAttempts: 0
    };
    
    parent.children.push(child.id);
    this.nodes.set(child.id, child);
    
    return child;
  }
}
```

### 6. Intervention & Monitoring API

```typescript
class InterventionAPI {
  constructor(private workers: WorkerPool, private ws: WebSocketServer) {}
  
  // Real-time monitoring
  streamTask(taskId: string, client: WebSocket) {
    this.eventBus.on('event', (event) => {
      if (event.taskId === taskId) {
        client.send(JSON.stringify(event));
      }
    });
  }
  
  // Mid-execution intervention
  async injectPrompt(taskId: string, prompt: string) {
    const worker = this.workers.getWorkerForTask(taskId);
    worker.postMessage({
      type: 'inject',
      taskId,
      prompt
    });
  }
  
  // Modify running task
  async modifyTask(taskId: string, updates: Partial<Task>) {
    const worker = this.workers.getWorkerForTask(taskId);
    worker.postMessage({
      type: 'modify',
      taskId,
      updates
    });
  }
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Sprint 0-2)
1. **Replace subprocess layer**
   - Implement Claude Code SDK integration
   - Add `node-pty` for interactive fallback
   - Remove all `execSync` usage

2. **Build event system**
   - Create EventBus with JSONL persistence
   - Add filesystem watchers (chokidar)
   - Implement WebSocket streaming

3. **Worker pool**
   - Implement elastic scaling (2-8 workers)
   - Add task queue with backpressure
   - Enable true parallel execution

### Phase 2: Verification Layer (Sprint 3-4)
1. **Mandatory verification**
   - File existence checks
   - Test execution with coverage
   - Security scanning
   - Runtime validation

2. **Feedback loops**
   - Automatic retry with error context
   - Deception detection patterns
   - Cross-model verification (Gemini as judge)

### Phase 3: Advanced Features (Sprint 5-6)
1. **MCTS Integration**
   - UCB1 selection algorithm
   - Reward backpropagation
   - Transposition table

2. **Multi-agent orchestration**
   - Parent-child DAG visualization
   - Cross-agent communication
   - Resource optimization

## Key Technical Decisions

### 1. Why Claude Code SDK over CLI?
- **Pros**: Native streaming, better error handling, no TTY issues
- **Cons**: Less control over system environment
- **Decision**: Use SDK by default, PTY for interactive sessions

### 2. Why Worker Threads over Cluster?
- **Pros**: Shared memory, lower overhead, easier communication
- **Cons**: Single process crash affects all workers
- **Decision**: Worker threads with process isolation per project

### 3. Why JSONL over Database?
- **Pros**: Simple, append-only, grep-able, replay-able
- **Cons**: No indexing, potential size issues
- **Decision**: JSONL with daily rotation and optional DB export

### 4. Why Mandatory Verification?
- **Pros**: Trustable outputs, catches deception, ensures quality
- **Cons**: Slower execution, more complex
- **Decision**: Non-negotiable requirement for "completed" status

## Migration Strategy

### From v1.0 to v2.0
1. **Keep**: MCP protocol interface, tool definitions
2. **Replace**: Subprocess layer, execution engine
3. **Add**: Verification, streaming, worker pool
4. **Remove**: Research-only prompts, execSync calls

### Incremental Rollout
1. Create `feature/v2-streaming` branch
2. Implement SDK integration in parallel
3. A/B test old vs new execution
4. Gradual migration of tools
5. Full cutover once verified

## Success Metrics

### Technical Metrics
- **Implementation Rate**: >95% of tasks produce code
- **Verification Pass Rate**: >80% on first attempt
- **Parallel Execution**: 4-8 concurrent tasks
- **Stream Latency**: <100ms per event
- **Task Duration**: Support 5-20 minute tasks

### Quality Metrics
- **Test Coverage**: Average >80%
- **Security Issues**: 0 high/critical vulnerabilities
- **Deception Rate**: <5% false completions
- **Retry Success**: >90% pass after feedback

## Open Questions & Research

### Immediate Research Needs
1. **Session Persistence**: Can Claude Code SDK resume sessions like CLI?
2. **Resource Limits**: How many PTY processes can we safely run?
3. **Memory Management**: Worker thread memory sharing strategies?

### Future Considerations
1. **Multi-Model Support**: Integrate Gemini, Codex for diversity
2. **Distributed Execution**: Scale beyond single machine
3. **Persistent Context**: Long-term memory across sessions

## References

- [Claude Code SDK Documentation](https://docs.anthropic.com/en/docs/claude-code/sdk)
- [Flow: Modular LLM Framework (arXiv:2501.07834v2)](https://arxiv.org/abs/2501.07834v2)
- [Future is Agentic (July 2025)](https://arxiv.org/abs/2507.01376)
- [Node-pty Documentation](https://github.com/microsoft/node-pty)
- [FastMCP Framework](https://github.com/punkpeye/fastmcp)

## Conclusion

Axiom MCP v2.0 transforms from a "calculator that can't add" into a reliable code generation system by:
1. Using proper streaming APIs instead of blocking CLI calls
2. Implementing mandatory verification that can't be fooled
3. Enabling true parallel execution with worker threads
4. Providing real-time observability and intervention
5. Building trust through proof, not promises

The path forward is clear: implement Sprint 0 (PTY + SDK integration) to unblock everything else.