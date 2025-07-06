# Axiom MCP v2.0 - Sprint 0 Implementation Plan

## Critical Context
Based on expert analysis from other models, we must avoid these specific mistakes:
1. **DO NOT** use `execSync` or basic `spawn` - they will fail
2. **DO NOT** try to make Claude CLI interactive without PTY
3. **DO NOT** mark tasks complete without verification
4. **DO NOT** attempt to fix CLI limitations - use SDK instead

## Sprint 0: Unblock Execution (Days 1-3)

### Day 1: Install Core Dependencies & Create PTY Wrapper

**Morning: Setup**
```bash
cd axiom-mcp
npm install node-pty@1.0.0
npm install @anthropic-ai/claude-code@latest
npm install chokidar@3.6.0
npm install simple-git@3.24.0
npm install ws@8.17.0
```

**Afternoon: Create PTY Executor (Follow GoodIdeas exactly)**
```typescript
// src/v2/executors/pty-executor.ts
import * as pty from 'node-pty';
import { EventEmitter } from 'events';

export class PtyExecutor extends EventEmitter {
  private ptyProcess: pty.IPty;
  private outputBuffer: string = '';
  
  async execute(command: string, args: string[], taskId: string): Promise<void> {
    // CRITICAL: Use exact configuration from GoodIdeas
    this.ptyProcess = pty.spawn(command, args, {
      name: 'xterm-color',
      cols: 120,
      rows: 40,
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    
    // Stream output
    this.ptyProcess.onData((data) => {
      this.outputBuffer += data;
      this.emit('data', { taskId, data, timestamp: Date.now() });
    });
    
    // Heartbeat to prevent timeout (from GoodIdeas)
    const heartbeat = setInterval(() => {
      this.ptyProcess.write('\x00'); // Zero-width char
    }, 180_000); // 3 minutes as recommended
    
    this.ptyProcess.onExit(({ exitCode }) => {
      clearInterval(heartbeat);
      this.emit('exit', { taskId, exitCode });
    });
  }
  
  write(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }
}
```

### Day 2: Implement SDK Streamer & Event Bus

**Morning: Claude SDK Integration**
```typescript
// src/v2/executors/sdk-executor.ts
import { query, type SDKMessage } from "@anthropic-ai/claude-code";
import { EventEmitter } from 'events';

export class SdkExecutor extends EventEmitter {
  async execute(prompt: string, taskId: string, options: {
    interactive: boolean;
    maxTurns: number;
  }): Promise<void> {
    try {
      // Use streaming as shown in GoodIdeas
      for await (const message of query({
        prompt,
        options: {
          cwd: `./sandbox/${taskId}`,
          maxTurns: options.maxTurns || 10,
        }
      })) {
        this.emit('delta', {
          timestamp: new Date().toISOString(),
          taskId,
          event: 'assistant_delta',
          payload: message
        });
      }
    } catch (error) {
      this.emit('error', { taskId, error });
    }
  }
}
```

**Afternoon: Event Bus with JSONL**
```typescript
// src/v2/core/event-bus.ts
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface LedgerEvent {
  timestamp: string;
  taskId: string;
  workerId: string;
  event: string;
  payload: unknown;
}

export class EventBus extends EventEmitter {
  private ledgerStream: fs.WriteStream;
  
  constructor() {
    super();
    const logFile = path.join('logs', `events-${Date.now()}.jsonl`);
    this.ledgerStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    // Auto-persist all events
    this.on('event', (event: LedgerEvent) => {
      this.ledgerStream.write(JSON.stringify(event) + '\n');
    });
  }
  
  logEvent(event: Omit<LedgerEvent, 'timestamp'>): void {
    const fullEvent: LedgerEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };
    this.emit('event', fullEvent);
  }
}
```

### Day 3: Basic Worker & Test Execution

**Morning: Single Worker Prototype**
```typescript
// src/v2/workers/task-worker.ts
import { parentPort } from 'worker_threads';
import { PtyExecutor } from '../executors/pty-executor';
import { SdkExecutor } from '../executors/sdk-executor';

parentPort?.on('message', async (message) => {
  const { type, task } = message;
  
  if (type === 'execute') {
    let executor;
    
    // Decision logic from GoodIdeas
    if (task.interactive || task.requiresPermissions) {
      executor = new PtyExecutor();
      await executor.execute('claude', [
        '--dangerously-skip-permissions',
        '-p', task.prompt
      ], task.id);
    } else {
      executor = new SdkExecutor();
      await executor.execute(task.prompt, task.id, {
        interactive: false,
        maxTurns: task.maxTurns || 10
      });
    }
    
    executor.on('data', (data) => {
      parentPort?.postMessage({ type: 'stream', data });
    });
    
    executor.on('exit', (result) => {
      parentPort?.postMessage({ type: 'complete', result });
    });
  }
});
```

**Afternoon: Test & Verify**
```bash
# Create test script
cat > test-sprint0.js << 'EOF'
import { PtyExecutor } from './dist/v2/executors/pty-executor.js';
import { EventBus } from './dist/v2/core/event-bus.js';

const executor = new PtyExecutor();
const bus = new EventBus();

executor.on('data', (data) => {
  bus.logEvent({
    taskId: 'test-001',
    workerId: 'main',
    event: 'stdout',
    payload: data
  });
  console.log('Got data:', data.data);
});

console.log('Starting PTY test...');
await executor.execute('claude', [
  '--dangerously-skip-permissions',
  '-p', 'Write a hello world Python script'
], 'test-001');
EOF

# Run test
npm run build:v2
node test-sprint0.js
```

## Success Criteria for Sprint 0

### Must Have (Block Sprint 1)
- [ ] PTY executor streams output in real-time
- [ ] No 30-second timeout errors
- [ ] Events written to JSONL file
- [ ] Can see Claude's output character by character
- [ ] SDK executor works for non-interactive tasks

### Should Have
- [ ] Basic error handling
- [ ] Graceful shutdown
- [ ] Output parsing for tool calls

### Sprint 0 Deliverables
1. Working PTY executor that doesn't timeout
2. Working SDK executor for simple tasks  
3. Event bus that persists to JSONL
4. Single successful test creating a Python file

## What NOT to Do (From Expert Analysis)

### Process Management
- ❌ `execSync` - Blocks, no streaming, times out
- ❌ `spawn` with pipes - Claude won't respond
- ❌ Shell: true - Doesn't help
- ✅ `node-pty` - Provides real TTY

### Architecture
- ❌ Complex orchestration before basics work
- ❌ Multiple execution strategies  
- ❌ Premature optimization
- ✅ Single working path first

### Verification
- ❌ Trust LLM output
- ❌ Optional verification
- ❌ Complex scoring systems
- ✅ Simple file existence check

## Daily Checklist

### Day 1 End
- [ ] `node-pty` installed and imported
- [ ] Basic PTY wrapper compiles
- [ ] Can spawn Claude process

### Day 2 End  
- [ ] SDK executor implemented
- [ ] Event bus logs to JSONL
- [ ] Both executors emit events

### Day 3 End
- [ ] Single worker can execute task
- [ ] Output streams to console
- [ ] File created on disk
- [ ] No timeout errors

## Commit Strategy

```bash
# Day 1
git add .
git commit -m "feat: Add PTY executor with heartbeat for Claude CLI

- Implements node-pty wrapper as recommended in expert analysis
- Adds 3-minute heartbeat to prevent timeouts
- Streams output in real-time

Based on GoodIdeasFromOtherModels.txt recommendations"

# Day 2  
git commit -m "feat: Add Claude Code SDK executor and event bus

- Implements streaming SDK integration for non-interactive tasks
- Creates append-only JSONL event ledger
- Routes all events through central bus

Following GoodIdeasFromChatGPTo3.txt architecture"

# Day 3
git commit -m "feat: Add basic worker and successful test execution

- Single worker can execute both PTY and SDK modes
- Successfully creates Python file without timeout
- Proves the architecture works end-to-end

Sprint 0 complete - execution layer unblocked"
```

## Next: Sprint 1 Plan Preview

Once Sprint 0 proves we can execute without timeouts:

1. **Worker Pool** - Multiple workers with queue
2. **Verification** - Wire up existing verification  
3. **WebSocket** - Real-time monitoring
4. **Retry Logic** - Handle failures gracefully

But ONLY after Sprint 0 works perfectly.

---

**Remember**: The experts were clear - fix the execution layer first. Everything else depends on this working correctly.