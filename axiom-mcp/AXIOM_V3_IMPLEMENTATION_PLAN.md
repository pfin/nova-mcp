# Axiom MCP v3 Implementation Plan

## Grounding Documents
- **GoodIdeasFromOtherModels.txt** - Expert analysis identifying architectural requirements
- **GoodIdeasFromChatGPTo3.txt** - Streaming architecture and verification patterns

## Current Reality Check
We've implemented ~10% of expert recommendations:
- ✅ Basic PTY executor (prevents timeout)
- ✅ Heartbeat mechanism  
- ✅ Basic event logging
- ❌ Everything else

## Phase 1: Master Controller Architecture (Current Focus)

### 1.1 Master Controller (`src-v3/core/master-controller.ts`)
Based on expert recommendation: "The main process will act as a Master Controller, managing a pool of worker threads"

```typescript
class MasterController {
  private taskQueue: PriorityQueue<Task>;
  private workerPool: Map<string, Worker>;
  private portGraph: Map<string, PortInfo>;
  private eventLedger: EventLedger;
  private wsServer: WebSocketServer;
  
  // Manages lifecycle of all tasks and workers
  async assignTask(task: Task): Promise<void>;
  async spawnWorker(): Promise<Worker>;
  async handleWorkerMessage(workerId: string, message: any): Promise<void>;
}
```

### 1.2 Task Queue Implementation
From docs: "When a new task comes in, it assigns it to an available worker from the pool"

```typescript
interface Task {
  id: string;
  parentId: string | null;
  prompt: string;
  priority: number;
  acceptanceCriteria: AcceptanceCriteria;
  status: 'queued' | 'assigned' | 'running' | 'verifying' | 'complete' | 'failed';
  mctsNode?: MCTSNode; // For MCTS integration
}
```

## Phase 2: Worker Thread Architecture

### 2.1 Worker Implementation (`src-v3/workers/claude-worker.ts`)
From docs: "Each worker is responsible for managing the lifecycle of a single Claude subprocess inside a PTY"

```typescript
// In worker thread
parentPort.on('message', async (message) => {
  switch(message.type) {
    case 'execute':
      const pty = new PtyExecutor();
      
      // Stream output to master
      pty.on('data', (data) => {
        parentPort.postMessage({ type: 'stream', payload: data });
        
        // Parse for TOOL_INVOCATION
        if (data.includes('TOOL_INVOCATION:')) {
          const toolCall = parseToolInvocation(data);
          parentPort.postMessage({ type: 'tool_call', payload: toolCall });
        }
      });
      
    case 'intervene':
      pty.write(message.payload);
      break;
  }
});
```

## Phase 3: Verification Layer

### 3.1 Task Verifier (`src-v3/verification/task-verifier.ts`)
From docs: "Verification must be a mandatory, automated step in the task lifecycle"

```typescript
class TaskVerifier {
  async verify(task: Task, workDir: string): Promise<VerificationResult> {
    const checks = {
      filesCreated: await this.checkFilesExist(task.expectedFiles),
      codeExecutes: await this.tryExecute(task.mainFile),
      testsPass: await this.runTests(workDir),
      lintPasses: await this.runLinter(workDir),
      noBrokenImports: await this.checkImports(workDir)
    };
    
    return {
      passed: Object.values(checks).every(Boolean),
      checks,
      evidence: await this.gatherEvidence(workDir)
    };
  }
}
```

### 3.2 MCTS Reward Integration
From docs: "The numeric score from calculateReward must be directly calculated using SystemVerification.gatherProof()"

```typescript
// In mcts-engine.ts
private async calculateReward(node: MCTSNode): Promise<number> {
  const proof = await this.verifier.verify(node.task, node.workDir);
  
  let reward = 0;
  if (proof.checks.filesCreated) reward += 0.3;
  if (proof.checks.codeExecutes) reward += 0.3;
  if (proof.checks.testsPass) reward += 0.4;
  
  // Meta-cognitive multiplier
  const metaScore = calculateMetaCognitiveScore(node.output);
  reward *= (0.5 + 0.5 * metaScore); // 50-100% based on BEFORE/AFTER/HOW
  
  // Penalize deceptive patterns
  if (hasDeceptivePatterns(node.output)) {
    reward *= 0.5;
  }
  
  return reward;
}
```

## Phase 4: Real-time Monitoring

### 4.1 WebSocket Server
From docs: "A WebSocket server is the ideal choice for streaming"

```typescript
class MonitoringServer {
  private wss: WebSocketServer;
  
  constructor(private master: MasterController) {
    this.wss = new WebSocketServer({ port: 8080 });
    
    this.wss.on('connection', (ws) => {
      // Subscribe to task events
      this.master.on('task:update', (event) => {
        ws.send(JSON.stringify({
          type: 'task_update',
          taskId: event.taskId,
          status: event.status,
          output: event.output
        }));
      });
      
      // Handle intervention commands
      ws.on('message', (data) => {
        const cmd = JSON.parse(data);
        if (cmd.type === 'intervene') {
          this.master.intervene(cmd.taskId, cmd.prompt);
        }
      });
    });
  }
}
```

## Phase 5: Sidecar Processes

### 5.1 Console Watcher
From docs: "Tails stdout/stderr from the execution sandbox in real time"

```typescript
class ConsoleWatcher {
  private patterns = [
    /Traceback/,
    /Error:/,
    /Exception/,
    /FAILED/,
    /SyntaxError/
  ];
  
  watch(stream: ReadableStream): void {
    stream.on('data', (chunk) => {
      const text = chunk.toString();
      
      for (const pattern of this.patterns) {
        if (pattern.test(text)) {
          this.master.emit('console:alert', {
            pattern: pattern.source,
            context: text,
            severity: 'error'
          });
        }
      }
    });
  }
}
```

## Phase 6: Judge System

### 6.1 Cross-Model Validation
From docs: "Using an orthogonal model family reduces correlated blind-spots"

```typescript
class JudgeAgent {
  async judge(task: Task, evidence: Evidence): Promise<Judgment> {
    // Use different model than the one that did the task
    const judgeModel = task.model === 'claude' ? 'gemini' : 'claude';
    
    const prompt = `
    Task: ${task.prompt}
    
    Evidence:
    - Files created: ${evidence.filesCreated}
    - Tests passed: ${evidence.testResults}
    - Console output: ${evidence.consoleOutput}
    
    In 60 words or fewer, decide PASS/FAIL for each criterion.
    Quote one line of evidence for each decision.
    `;
    
    return await this.callModel(judgeModel, prompt);
  }
}
```

## Implementation Order

1. **Week 1**: Master Controller + Task Queue
   - Basic worker pool management
   - Task assignment logic
   - Message passing infrastructure

2. **Week 2**: Worker Threads + Verification
   - PTY integration in workers
   - Tool invocation parsing
   - Basic verification after tasks

3. **Week 3**: MCTS Integration
   - Wire verification to rewards
   - Meta-cognitive scoring
   - Make MCTS default mode

4. **Week 4**: Monitoring + Intervention
   - WebSocket server
   - Real-time streaming UI
   - Intervention capabilities

5. **Week 5**: Sidecars + Judge
   - Console watcher
   - Criteria checker
   - Cross-model validation

## Success Criteria

1. **No timeouts**: Tasks can run for 30+ minutes
2. **True parallelism**: 10+ concurrent workers
3. **Verified execution**: 0% false completion rate
4. **Real-time monitoring**: <100ms latency on output
5. **MCTS optimization**: 80%+ implementation success rate

## Key Principles (from expert docs)

1. **"Trust is achieved by creating a system where every claim is challenged"**
2. **"The LLM is the worker, but the TaskVerifier is the inspector"**
3. **"This changes the definition of 'done' from 'the LLM stopped talking' to 'the work has been independently verified'"**
4. **"The calculateMetaCognitiveScore should be a multiplier in the MCTS reward function"**