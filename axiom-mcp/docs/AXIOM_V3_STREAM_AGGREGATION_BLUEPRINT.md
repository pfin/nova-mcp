# Axiom MCP v3: Stream Aggregation Technical Blueprint

## Immediate Implementation: Verbose Master Mode

### Problem Statement
- Child tasks execute silently in background
- No visibility into parallel execution
- Blocking wait prevents interaction
- Interventions happen but can't be seen

### Solution Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Main Process                        │
│  ┌─────────────────────────────────────────────┐   │
│  │           StreamAggregator2025               │   │
│  │  ┌─────────────────────────────────────┐    │   │
│  │  │     Multiplexer (bpmux/streamx)     │    │   │
│  │  └──────────▲─────────▲────────▲───────┘    │   │
│  │             │         │        │             │   │
│  │  ┌──────────┴───┐ ┌───┴────┐ ┌┴──────────┐ │   │
│  │  │ Child PTY 1  │ │ PTY 2  │ │ SDK Exec 3│ │   │
│  │  └──────────────┘ └────────┘ └───────────┘ │   │
│  └─────────────────────────────────────────────┘   │
│                        │                             │
│                        ▼                             │
│               Console Output                         │
│  [abc123] Creating factorial.py...                  │
│  [def456] Analyzing approach...                     │
│  [abc123] def factorial(n):                        │
│  [def456] [INTERVENTION] Stop planning!             │
└─────────────────────────────────────────────────────┘
```

## Technical Implementation

### 1. Core StreamAggregator Class

```typescript
// src-v3/aggregators/stream-aggregator-2025.ts
import { Transform, Readable, pipeline } from 'streamx';
import { EventEmitter } from 'events';
import chalk from 'chalk';

interface StreamOptions {
  outputMode: 'console' | 'websocket' | 'both';
  colorize: boolean;
  bufferSize: number;
  flushInterval: number;
}

export class StreamAggregator2025 extends EventEmitter {
  private streams = new Map<string, StreamMetadata>();
  private multiplexer: Transform;
  private outputBuffer = new Map<string, string[]>();
  private flushTimer?: NodeJS.Timer;
  
  constructor(private options: StreamOptions) {
    super();
    
    // Create the multiplexing transform stream
    this.multiplexer = new Transform({
      objectMode: true,
      highWaterMark: options.bufferSize || 1000,
      
      transform(chunk: StreamChunk, cb) {
        const formatted = this.formatOutput(chunk);
        
        // Handle back-pressure correctly
        if (this.push(formatted)) {
          cb();
        } else {
          // Wait for drain event
          this.once('drain', () => cb());
        }
      }
    });
    
    // Set up output routing
    this.setupOutputRouting();
    
    // Flush timer for batched output
    if (options.flushInterval) {
      this.flushTimer = setInterval(() => this.flush(), options.flushInterval);
    }
  }
  
  private formatOutput(chunk: StreamChunk): string {
    const { taskId, data, timestamp, type } = chunk;
    const shortId = taskId.substring(0, 8);
    const color = this.getTaskColor(taskId);
    
    let prefix = `[${shortId}]`;
    if (this.options.colorize) {
      prefix = chalk.hex(color)(prefix);
    }
    
    // Special formatting for interventions
    if (type === 'intervention') {
      const intervention = chalk.red.bold('[INTERVENTION]');
      return `${prefix} ${intervention} ${data}`;
    }
    
    // Add timing info for debugging
    if (process.env.DEBUG) {
      const time = new Date(timestamp).toISOString();
      prefix = `${time} ${prefix}`;
    }
    
    return `${prefix} ${data}`;
  }
  
  attachExecutor(taskId: string, executor: any, metadata: TaskMetadata) {
    const streamMeta: StreamMetadata = {
      taskId,
      shortId: taskId.substring(0, 8),
      executor,
      metadata,
      startTime: Date.now(),
      byteCount: 0,
      lineCount: 0,
      interventions: 0,
      lastActivity: Date.now()
    };
    
    this.streams.set(taskId, streamMeta);
    
    // Create a transform stream for this executor
    const executorTransform = new Transform({
      transform: (chunk, cb) => {
        streamMeta.byteCount += chunk.length;
        streamMeta.lastActivity = Date.now();
        
        // Detect interventions
        if (chunk.toString().includes('[INTERVENTION]')) {
          streamMeta.interventions++;
          this.emit('intervention', { taskId, count: streamMeta.interventions });
        }
        
        // Parse into lines for proper prefixing
        const lines = chunk.toString().split(/\r?\n/);
        for (const line of lines) {
          if (line) {
            streamMeta.lineCount++;
            cb(null, {
              taskId,
              data: line,
              timestamp: Date.now(),
              type: this.detectLineType(line)
            });
          }
        }
      }
    });
    
    // Handle different executor types
    if (executor.on && executor.pipe) {
      // PTY executor - pipe output
      executor.pipe(executorTransform).pipe(this.multiplexer);
    } else if (executor.on) {
      // Event-based executor
      executor.on('data', (event: any) => {
        if (event.type === 'data') {
          executorTransform.write(event.payload);
        }
      });
      
      executor.on('error', (event: any) => {
        executorTransform.write(`[ERROR] ${event.payload}\n`);
      });
      
      executor.on('exit', () => {
        executorTransform.end();
        this.handleStreamComplete(taskId);
      });
    }
    
    // Progress monitoring
    this.monitorProgress(taskId);
  }
  
  private monitorProgress(taskId: string) {
    const checkInterval = setInterval(() => {
      const stream = this.streams.get(taskId);
      if (!stream) {
        clearInterval(checkInterval);
        return;
      }
      
      const idleTime = Date.now() - stream.lastActivity;
      if (idleTime > 30000) {
        this.emit('idle', { taskId, idleTime });
      }
      
      // Emit stats periodically
      this.emit('stats', {
        taskId,
        bytes: stream.byteCount,
        lines: stream.lineCount,
        interventions: stream.interventions,
        uptime: Date.now() - stream.startTime
      });
    }, 5000);
    
    // Store interval for cleanup
    const stream = this.streams.get(taskId);
    if (stream) {
      stream.monitorInterval = checkInterval;
    }
  }
  
  private handleStreamComplete(taskId: string) {
    const stream = this.streams.get(taskId);
    if (!stream) return;
    
    // Clear monitoring
    if (stream.monitorInterval) {
      clearInterval(stream.monitorInterval);
    }
    
    // Emit completion stats
    const duration = Date.now() - stream.startTime;
    this.emit('complete', {
      taskId,
      duration,
      bytes: stream.byteCount,
      lines: stream.lineCount,
      interventions: stream.interventions
    });
    
    // Cleanup
    this.streams.delete(taskId);
    
    // Check if all streams complete
    if (this.streams.size === 0) {
      this.emit('allComplete');
    }
  }
  
  // Get real-time stats
  getStats(): AggregatorStats {
    const activeStreams = Array.from(this.streams.values()).map(s => ({
      taskId: s.taskId,
      uptime: Date.now() - s.startTime,
      bytes: s.byteCount,
      lines: s.lineCount,
      interventions: s.interventions,
      idle: Date.now() - s.lastActivity
    }));
    
    return {
      activeCount: this.streams.size,
      totalBytes: activeStreams.reduce((sum, s) => sum + s.bytes, 0),
      totalLines: activeStreams.reduce((sum, s) => sum + s.lines, 0),
      totalInterventions: activeStreams.reduce((sum, s) => sum + s.interventions, 0),
      streams: activeStreams
    };
  }
}

// Type definitions
interface StreamChunk {
  taskId: string;
  data: string;
  timestamp: number;
  type: 'output' | 'error' | 'intervention' | 'progress';
}

interface StreamMetadata {
  taskId: string;
  shortId: string;
  executor: any;
  metadata: TaskMetadata;
  startTime: number;
  byteCount: number;
  lineCount: number;
  interventions: number;
  lastActivity: number;
  monitorInterval?: NodeJS.Timer;
}

interface TaskMetadata {
  prompt: string;
  index: number;
  depth: number;
  pattern: string;
}

interface AggregatorStats {
  activeCount: number;
  totalBytes: number;
  totalLines: number;
  totalInterventions: number;
  streams: Array<{
    taskId: string;
    uptime: number;
    bytes: number;
    lines: number;
    interventions: number;
    idle: number;
  }>;
}
```

### 2. Integration with axiom-mcp-spawn

```typescript
// Modifications to axiom-mcp-spawn.ts

import { StreamAggregator2025 } from '../aggregators/stream-aggregator-2025.js';

// Add to schema
export const axiomMcpSpawnSchema = z.object({
  // ... existing fields ...
  verboseMasterMode: z.boolean().default(false)
    .describe('Stream all child output in real-time'),
  streamingOptions: z.object({
    outputMode: z.enum(['console', 'websocket', 'both']).default('console'),
    colorize: z.boolean().default(true),
    bufferSize: z.number().default(1000),
    flushInterval: z.number().default(100)
  }).optional()
});

// In handleAxiomMcpSpawn function
if (input.verboseMasterMode && childPromises.length > 0) {
  // Create aggregator
  const aggregator = new StreamAggregator2025(
    input.streamingOptions || {
      outputMode: 'console',
      colorize: true,
      bufferSize: 1000,
      flushInterval: 100
    }
  );
  
  // Status display
  console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('           VERBOSE MASTER MODE - PARALLEL EXECUTION          '));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.gray(`Parent Task: ${input.parentPrompt}`));
  console.log(chalk.gray(`Pattern: ${input.spawnPattern} | Children: ${subtasks.length}`));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  
  // Progress bar
  const progressBar = new cliProgress.MultiBar({
    format: '{taskId} |{bar}| {percentage}% | {interventions} interventions',
    clearOnComplete: false,
    hideCursor: true
  }, cliProgress.Presets.shades_classic);
  
  // Launch children with aggregation
  for (let i = 0; i < subtasks.length; i++) {
    const childId = childTaskIds[i];
    const subtask = subtasks[i];
    
    // Create progress bar for this child
    const bar = progressBar.create(100, 0, {
      taskId: childId.substring(0, 8),
      interventions: 0
    });
    
    // Determine executor type
    const useChildInteractive = needsInteractiveExecution(subtask);
    
    // Create executor but don't await
    const executor = useChildInteractive
      ? new PtyExecutor({ /* options */ })
      : new SdkExecutor({ /* options */ });
    
    // Attach to aggregator
    aggregator.attachExecutor(childId, executor, {
      prompt: subtask,
      index: i,
      depth: childTask.depth,
      pattern: input.spawnPattern
    });
    
    // Update progress on events
    aggregator.on('stats', (stats) => {
      if (stats.taskId === childId) {
        bar.update(Math.min(stats.lines / 10, 100), {
          interventions: stats.interventions
        });
      }
    });
    
    // Execute asynchronously
    const executePromise = useChildInteractive
      ? executeWithPty(childPrompt, childId, systemPrompt, conversationDB)
      : executeWithSdk(childPrompt, childId, systemPrompt, conversationDB);
    
    executePromise
      .then(output => {
        bar.update(100);
        console.log(chalk.green(`✓ [${childId.substring(0, 8)}] Completed`));
      })
      .catch(error => {
        bar.update(100);
        console.log(chalk.red(`✗ [${childId.substring(0, 8)}] Failed: ${error.message}`));
      });
  }
  
  // Real-time monitoring
  aggregator.on('intervention', ({ taskId, count }) => {
    console.log(chalk.yellow(`\n⚡ Intervention #${count} in task ${taskId.substring(0, 8)}\n`));
  });
  
  aggregator.on('idle', ({ taskId, idleTime }) => {
    console.log(chalk.yellow(`\n⏸ Task ${taskId.substring(0, 8)} idle for ${idleTime / 1000}s\n`));
  });
  
  // Return immediately if requested
  if (input.returnImmediately) {
    return {
      content: [{
        type: 'text',
        text: formatImmediateReturnResponse(rootTaskId, childTaskIds, aggregator)
      }]
    };
  }
  
  // Otherwise wait for completion with visibility
  await new Promise(resolve => {
    aggregator.on('allComplete', () => {
      progressBar.stop();
      console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.green.bold('                    ALL TASKS COMPLETED                      '));
      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
      
      const stats = aggregator.getStats();
      console.log(chalk.gray(`Total Output: ${formatBytes(stats.totalBytes)}`));
      console.log(chalk.gray(`Total Lines: ${stats.totalLines.toLocaleString()}`));
      console.log(chalk.gray(`Total Interventions: ${stats.totalInterventions}`));
      
      resolve(null);
    });
  });
}
```

### 3. Back-pressure Handling

```typescript
class BackPressureManager {
  private queues = new Map<string, Buffer[]>();
  private paused = new Map<string, boolean>();
  private highWaterMark: number;
  
  constructor(highWaterMark = 16384) { // 16KB default
    this.highWaterMark = highWaterMark;
  }
  
  shouldPause(streamId: string): boolean {
    const queue = this.queues.get(streamId) || [];
    const totalSize = queue.reduce((sum, buf) => sum + buf.length, 0);
    return totalSize > this.highWaterMark;
  }
  
  write(streamId: string, chunk: Buffer): boolean {
    let queue = this.queues.get(streamId);
    if (!queue) {
      queue = [];
      this.queues.set(streamId, queue);
    }
    
    queue.push(chunk);
    
    if (this.shouldPause(streamId) && !this.paused.get(streamId)) {
      this.paused.set(streamId, true);
      return false; // Signal back-pressure
    }
    
    return true;
  }
  
  drain(streamId: string, consumer: (chunk: Buffer) => boolean) {
    const queue = this.queues.get(streamId);
    if (!queue) return;
    
    while (queue.length > 0) {
      const chunk = queue[0];
      if (!consumer(chunk)) {
        // Consumer can't accept more
        break;
      }
      queue.shift();
    }
    
    // Check if we can resume
    if (this.paused.get(streamId) && !this.shouldPause(streamId)) {
      this.paused.set(streamId, false);
      return true; // Signal resume
    }
    
    return false;
  }
}
```

### 4. WebSocket Streaming (Optional)

```typescript
// src-v3/servers/stream-websocket-server.ts
import { WebSocketServer } from 'ws';
import { StreamAggregator2025 } from '../aggregators/stream-aggregator-2025.js';

export class StreamWebSocketServer {
  private wss: WebSocketServer;
  private aggregator?: StreamAggregator2025;
  
  constructor(port = 8080) {
    this.wss = new WebSocketServer({ port });
    
    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      
      // Send current stats
      if (this.aggregator) {
        ws.send(JSON.stringify({
          type: 'stats',
          data: this.aggregator.getStats()
        }));
      }
      
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });
  }
  
  attachAggregator(aggregator: StreamAggregator2025) {
    this.aggregator = aggregator;
    
    // Forward all events to WebSocket clients
    aggregator.on('stream', (data) => {
      this.broadcast({
        type: 'stream',
        data
      });
    });
    
    aggregator.on('intervention', (data) => {
      this.broadcast({
        type: 'intervention',
        data
      });
    });
    
    aggregator.on('stats', (data) => {
      this.broadcast({
        type: 'stats',
        data
      });
    });
  }
  
  private broadcast(message: any) {
    const payload = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(payload);
      }
    });
  }
}
```

## Performance Considerations

### 1. Memory Management
```typescript
// Circular buffer for output history
class CircularBuffer {
  private buffer: string[];
  private writeIndex = 0;
  private size: number;
  
  constructor(size = 10000) {
    this.size = size;
    this.buffer = new Array(size);
  }
  
  write(line: string) {
    this.buffer[this.writeIndex] = line;
    this.writeIndex = (this.writeIndex + 1) % this.size;
  }
  
  getRecent(count: number): string[] {
    const result: string[] = [];
    let index = (this.writeIndex - count + this.size) % this.size;
    
    for (let i = 0; i < count && i < this.size; i++) {
      if (this.buffer[index]) {
        result.push(this.buffer[index]);
      }
      index = (index + 1) % this.size;
    }
    
    return result;
  }
}
```

### 2. CPU Optimization
```typescript
// Batch line processing
class LineBatcher {
  private batch: string[] = [];
  private timer?: NodeJS.Timer;
  
  constructor(
    private callback: (lines: string[]) => void,
    private batchSize = 100,
    private maxDelay = 50
  ) {}
  
  add(line: string) {
    this.batch.push(line);
    
    if (this.batch.length >= this.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.maxDelay);
    }
  }
  
  flush() {
    if (this.batch.length > 0) {
      this.callback(this.batch);
      this.batch = [];
    }
    
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
describe('StreamAggregator2025', () => {
  it('should multiplex multiple streams', async () => {
    const aggregator = new StreamAggregator2025({
      outputMode: 'console',
      colorize: false,
      bufferSize: 100,
      flushInterval: 10
    });
    
    const mockExecutor1 = new EventEmitter();
    const mockExecutor2 = new EventEmitter();
    
    aggregator.attachExecutor('task1', mockExecutor1, { /* metadata */ });
    aggregator.attachExecutor('task2', mockExecutor2, { /* metadata */ });
    
    const output: string[] = [];
    aggregator.multiplexer.on('data', (chunk) => {
      output.push(chunk);
    });
    
    mockExecutor1.emit('data', { type: 'data', payload: 'Hello from task 1' });
    mockExecutor2.emit('data', { type: 'data', payload: 'Hello from task 2' });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(output).toContain('[task1] Hello from task 1');
    expect(output).toContain('[task2] Hello from task 2');
  });
});
```

## Rollout Plan

### Day 1: Core Implementation
1. Create StreamAggregator2025 class
2. Add schema fields
3. Basic integration test

### Day 2: Integration
1. Wire into axiom-mcp-spawn
2. Test with real PTY executors
3. Add progress bars

### Day 3: Polish
1. Add colors and formatting
2. Implement back-pressure handling
3. Add WebSocket server

### Day 4: Testing
1. Load testing with 10+ streams
2. Memory leak detection
3. Performance optimization

### Day 5: Documentation
1. User guide
2. API documentation
3. Troubleshooting guide

## Success Metrics
- Streams 10+ children without dropping data
- <10ms latency from child output to display
- <100MB memory overhead for 10 streams
- Zero data loss under back-pressure
- Interventions visible within 100ms

---

*Stream Aggregation Blueprint v1.0*  
*Date: July 6, 2025*  
*Ready for Implementation*