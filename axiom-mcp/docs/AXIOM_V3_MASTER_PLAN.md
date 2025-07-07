# Axiom MCP v3: Master Implementation Plan

**Last Updated**: July 7, 2025  
**Status**: Active Development  
**Current Phase**: Verbose Master Mode Implementation  
**System Completion**: 35% → Target 70%

## Document Map

This is the authoritative plan for Axiom MCP v3. All other documents reference this.

### Essential Documents (Keep These)
1. **THIS FILE** - Master plan and source of truth
2. [`CLAUDE.md`](../CLAUDE.md) - Development guide with quick status
3. [`docs/AXIOM_V3_VERIFICATION_CHECKLIST.md`](AXIOM_V3_VERIFICATION_CHECKLIST.md) - System health (35% complete)
4. [`docs/AXIOM_V3_TECHNICAL_REFERENCE_GUIDE.md`](AXIOM_V3_TECHNICAL_REFERENCE_GUIDE.md) - Architecture deep dive
5. [`docs/VERBOSE_MASTER_MODE_IMPLEMENTATION_PLAN.md`](VERBOSE_MASTER_MODE_IMPLEMENTATION_PLAN.md) - Current focus

### Documents to Archive/Remove
- Individual research files (consolidated here)
- Duplicate implementation summaries
- Old vision documents (superseded)
- Orphaned analysis files

## Current System State

### What Works (✅ 35%)
1. **Core Execution**
   - Parent tasks execute with PTY/SDK
   - Output captured to database
   - Temporal awareness active

2. **Intervention System** (Connected July 6, 18:43)
   - 30-second planning timeout
   - TODO detection
   - 10-second progress checks
   - Writes interventions to PTY stream

3. **Database Layer**
   - Conversations tracked
   - Actions recorded
   - Streams stored
   - Relationships maintained

4. **SDK Integration** (Added July 6, 20:10)
   - SDK executor imported
   - Task routing logic
   - Non-interactive task detection

### What's Missing (❌ 65%)
1. **Child Visibility** - Execute silently
2. **Stream Aggregation** - No prefixed output
3. **Parallel Execution** - Still sequential
4. **MCTS Integration** - Disconnected
5. **Worker Threads** - Unused
6. **Port Communication** - Allocated but not used

## Verbose Master Mode: Detailed Implementation Plan

### Why This First?
From research insights: "The difference between vision and reality isn't missing components—it's missing connections."

Verbose Master Mode connects existing components with minimal new code.

### Day 1: Foundation (Monday, July 7, 2025)

**Pre-work Checklist**:
- [ ] Run `bash date` to confirm temporal context
- [ ] Review AXIOM_V3_STREAM_AGGREGATION_BLUEPRINT.md for technical approach
- [ ] Check current build status: `npm run build:v3`
- [ ] Verify MCP inspector works: `npx @modelcontextprotocol/inspector dist-v3/index.js`
- [ ] Create Day 1 branch: `git checkout -b verbose-mode-day-1`

#### Morning Session (9:00 AM - 1:00 PM EDT)

**9:00-9:30 AM: Schema Update & Initial Setup**
```bash
# Start with temporal awareness
bash date

# Open the schema file
code src-v3/tools/axiom-mcp-spawn.ts
```

Exact changes needed:
```typescript
// File: src-v3/tools/axiom-mcp-spawn.ts
// After line 19 (inside the z.object({...}))
// Before the closing })

  verboseMasterMode: z.boolean()
    .default(false)
    .describe('Stream all child output in real-time with prefixes'),
  
  streamingOptions: z.object({
    outputMode: z.enum(['console', 'websocket', 'both']).default('console'),
    colorize: z.boolean().default(true),
    bufferSize: z.number().default(1000),
    flushInterval: z.number().default(100),
    includeTimestamps: z.boolean().default(false),
    prefixLength: z.number().default(8)
  }).optional().describe('Advanced streaming configuration')
```

Then update the type definition:
```typescript
// Around line 10, update the type
export type AxiomMcpSpawnInput = z.infer<typeof axiomMcpSpawnSchema>;
```

Build and verify:
```bash
npm run build:v3
# Should see no TypeScript errors
```

**9:30 AM-11:30 AM: Create StreamAggregator Component**

```bash
# Create the aggregators directory
mkdir -p src-v3/aggregators

# Create the main file
touch src-v3/aggregators/stream-aggregator.ts
```

Implement the core class with these specific sections:

1. **Imports and Types** (9:30-9:45 AM):
```typescript
// src-v3/aggregators/stream-aggregator.ts
import { EventEmitter } from 'events';
import { Transform, Writable } from 'stream';
import type { PtyExecutor } from '../executors/pty-executor.js';
import type { SdkExecutor } from '../executors/sdk-executor.js';
import type { StreamParser } from '../parsers/stream-parser.js';
import type { RuleVerifier } from '../verifiers/rule-verifier.js';
import type { ConversationDB } from '../database/conversation-db.js';
import { v4 as uuidv4 } from 'uuid';

interface StreamMetadata {
  taskId: string;
  shortId: string;
  executor: PtyExecutor | SdkExecutor;
  startTime: number;
  lineBuffer: string;
  byteCount: number;
  lineCount: number;
  lastActivity: number;
}

interface StreamChunk {
  taskId: string;
  data: string;
  timestamp: number;
  type: 'output' | 'error' | 'intervention' | 'progress';
}
```

2. **Core Class Structure** (9:45-10:15 AM):
```typescript
export class StreamAggregator extends EventEmitter {
  private activeStreams: Map<string, StreamMetadata> = new Map();
  private outputStream: NodeJS.WritableStream;
  private colorMap: Map<string, string> = new Map();
  private colors = ['cyan', 'green', 'yellow', 'blue', 'magenta'];
  private colorIndex = 0;
  
  constructor(
    private streamParser: StreamParser | null,
    private ruleVerifier: RuleVerifier | null,
    private conversationDB: ConversationDB | null,
    outputStream: NodeJS.WritableStream = process.stderr
  ) {
    super();
    this.outputStream = outputStream;
  }
  
  private getTaskColor(taskId: string): string {
    if (!this.colorMap.has(taskId)) {
      this.colorMap.set(taskId, this.colors[this.colorIndex % this.colors.length]);
      this.colorIndex++;
    }
    return this.colorMap.get(taskId)!;
  }
}
```

3. **PTY Executor Attachment** (10:15-11:00 AM):
```typescript
  attachChild(taskId: string, executor: PtyExecutor | SdkExecutor): void {
    const shortId = taskId.slice(0, 8);
    const prefix = `[${shortId}]`;
    
    const metadata: StreamMetadata = {
      taskId,
      shortId,
      executor,
      startTime: Date.now(),
      lineBuffer: '',
      byteCount: 0,
      lineCount: 0,
      lastActivity: Date.now()
    };
    
    this.activeStreams.set(taskId, metadata);
    this.outputLine(prefix, 'Starting execution...', 'cyan');
    
    if ('pty' in executor) {
      this.attachPtyExecutor(taskId, executor as PtyExecutor, prefix);
    } else {
      this.attachSdkExecutor(taskId, executor as SdkExecutor, prefix);
    }
  }
  
  private attachPtyExecutor(taskId: string, executor: PtyExecutor, prefix: string): void {
    const metadata = this.activeStreams.get(taskId)!;
    
    executor.on('data', async (event) => {
      if (event.type === 'data') {
        metadata.lastActivity = Date.now();
        metadata.byteCount += event.payload.length;
        
        // Buffer lines for clean output
        metadata.lineBuffer += event.payload;
        const lines = metadata.lineBuffer.split('\n');
        metadata.lineBuffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            metadata.lineCount++;
            this.outputLine(prefix, line);
            
            // Check for interventions
            if (line.includes('[INTERVENTION]')) {
              this.emit('intervention', { taskId, line });
            }
          }
        }
        
        // Still parse and store in DB
        if (this.streamParser) {
          const events = this.streamParser.parse(event.payload);
          if (events.length > 0 && this.conversationDB) {
            await this.storeEvents(taskId, events);
          }
        }
      }
    });
    
    executor.on('exit', () => this.handleChildExit(taskId));
    executor.on('error', (event) => {
      this.outputLine(prefix, `ERROR: ${event.payload}`, 'red');
    });
  }
```

4. **Output Formatting** (11:00-11:30 AM):
```typescript
  private outputLine(prefix: string, line: string, color?: string): void {
    const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
    let output = prefix;
    
    // Add color if terminal supports it
    if (color && this.outputStream === process.stderr && process.stderr.isTTY) {
      const colorCode = this.getAnsiColor(color);
      output = `\x1b[${colorCode}m${prefix}\x1b[0m`;
    }
    
    this.outputStream.write(`${output} ${line}\n`);
    
    // Emit for other consumers
    this.emit('line', { prefix, line, timestamp });
  }
  
  private getAnsiColor(color: string): string {
    const colors: Record<string, string> = {
      'red': '31',
      'green': '32', 
      'yellow': '33',
      'blue': '34',
      'magenta': '35',
      'cyan': '36'
    };
    return colors[color] || '37';
  }
```

**11:30 AM-1:00 PM: Write Unit Tests**

```bash
# Create test directory
mkdir -p src-v3/aggregators/__tests__

# Create test file
touch src-v3/aggregators/__tests__/stream-aggregator.test.ts
```

Implement comprehensive tests:

```typescript
// src-v3/aggregators/__tests__/stream-aggregator.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamAggregator } from '../stream-aggregator.js';
import { EventEmitter } from 'events';
import { Writable } from 'stream';

describe('StreamAggregator', () => {
  let aggregator: StreamAggregator;
  let outputBuffer: string[];
  let mockOutputStream: Writable;
  
  beforeEach(() => {
    outputBuffer = [];
    mockOutputStream = new Writable({
      write(chunk, encoding, callback) {
        outputBuffer.push(chunk.toString());
        callback();
      }
    });
    
    aggregator = new StreamAggregator(
      null, // No parser for unit tests
      null, // No verifier for unit tests
      null, // No DB for unit tests
      mockOutputStream
    );
  });
  
  it('should prefix output with task ID', async () => {
    const mockExecutor = new EventEmitter();
    const taskId = 'abc123def456ghi789';
    
    aggregator.attachChild(taskId, mockExecutor as any);
    
    // Simulate PTY output
    mockExecutor.emit('data', {
      type: 'data',
      payload: 'Hello from child process\n'
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(outputBuffer).toContainEqual(
      expect.stringContaining('[abc123de] Hello from child process')
    );
  });
  
  it('should handle line buffering correctly', async () => {
    const mockExecutor = new EventEmitter();
    const taskId = 'test123';
    
    aggregator.attachChild(taskId, mockExecutor as any);
    
    // Send partial lines
    mockExecutor.emit('data', { type: 'data', payload: 'Part 1' });
    mockExecutor.emit('data', { type: 'data', payload: ' Part 2\nComplete line\n' });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(outputBuffer).toContainEqual(
      expect.stringContaining('[test123] Part 1 Part 2')
    );
    expect(outputBuffer).toContainEqual(
      expect.stringContaining('[test123] Complete line')
    );
  });
  
  it('should track multiple streams', () => {
    const executor1 = new EventEmitter();
    const executor2 = new EventEmitter();
    
    aggregator.attachChild('task1', executor1 as any);
    aggregator.attachChild('task2', executor2 as any);
    
    expect(aggregator.getActiveCount()).toBe(2);
  });
  
  it('should emit intervention events', async () => {
    const mockExecutor = new EventEmitter();
    const interventionSpy = vi.fn();
    
    aggregator.on('intervention', interventionSpy);
    aggregator.attachChild('task123', mockExecutor as any);
    
    mockExecutor.emit('data', {
      type: 'data',
      payload: '[INTERVENTION] Stop planning and implement!\n'
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(interventionSpy).toHaveBeenCalledWith({
      taskId: 'task123',
      line: '[INTERVENTION] Stop planning and implement!'
    });
  });
  
  it('should clean up on child exit', async () => {
    const mockExecutor = new EventEmitter();
    const completeSpy = vi.fn();
    
    aggregator.on('child-complete', completeSpy);
    aggregator.attachChild('task123', mockExecutor as any);
    
    expect(aggregator.getActiveCount()).toBe(1);
    
    mockExecutor.emit('exit', { code: 0 });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(aggregator.getActiveCount()).toBe(0);
    expect(completeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task123',
        duration: expect.any(Number)
      })
    );
  });
});
```

Run tests:
```bash
npm run test:v3 -- stream-aggregator
```

#### Afternoon Session (2:00 PM - 6:00 PM EDT)

**2:00-2:30 PM: Integration Preparation**

```bash
# First, ensure morning work is committed
git add src-v3/aggregators/
git add src-v3/tools/axiom-mcp-spawn.ts
git commit -m "feat(verbose-mode): Add StreamAggregator and update schema"

# Open the spawn tool for integration
code src-v3/tools/axiom-mcp-spawn.ts
```

Add imports at the top of the file (after line 13):
```typescript
// src-v3/tools/axiom-mcp-spawn.ts
import { StreamAggregator } from '../aggregators/stream-aggregator.js';
import chalk from 'chalk';  // For colored output
import cliProgress from 'cli-progress';  // For progress bars
```

Update package.json if needed:
```bash
npm install chalk cli-progress
```

**2:30-5:30 PM: Modify handleAxiomMcpSpawn Function**

This is the critical integration work. Find the `handleAxiomMcpSpawn` function (around line 50).

**Step 1: Add Verbose Mode Check (2:30-3:00 PM)**

After the subtasks are parsed (around line 120), add:

```typescript
// Check if verbose mode is requested
if (input.verboseMasterMode && subtasks.length > 0) {
  console.error(chalk.cyan('\n' + '━'.repeat(60)));
  console.error(chalk.cyan.bold('    VERBOSE MASTER MODE - PARALLEL EXECUTION'));
  console.error(chalk.cyan('━'.repeat(60)));
  console.error(chalk.gray(`Parent: ${input.parentPrompt}`));
  console.error(chalk.gray(`Pattern: ${input.spawnPattern} | Children: ${subtasks.length}`));
  console.error(chalk.cyan('━'.repeat(60) + '\n'));
  
  // Create the stream aggregator
  const aggregator = new StreamAggregator(
    conversationDB ? new StreamParser() : null,
    conversationDB ? new RuleVerifier(conversationDB) : null,
    conversationDB,
    process.stderr
  );
  
  // Track completion
  let completedCount = 0;
  const startTime = Date.now();
  
  aggregator.on('child-complete', ({ taskId, duration }) => {
    completedCount++;
    console.error(chalk.gray(`\n[MASTER] Progress: ${completedCount}/${subtasks.length} tasks completed`));
    
    if (completedCount === subtasks.length) {
      const totalDuration = Date.now() - startTime;
      console.error(chalk.green(`\n[MASTER] All tasks completed in ${(totalDuration/1000).toFixed(1)}s\n`));
    }
  });
  
  aggregator.on('intervention', ({ taskId, line }) => {
    console.error(chalk.yellow(`\n⚡ Intervention detected in ${taskId.slice(0,8)}\n`));
  });
```

**Step 2: Create Progress Tracking (3:00-3:30 PM)**

```typescript
  // Create multi-progress bar
  const multibar = new cliProgress.MultiBar({
    format: '{taskId} |{bar}| {percentage}% | {lines} lines | {interventions} interventions',
    clearOnComplete: false,
    hideCursor: true,
    barCompleteChar: '█',
    barIncompleteChar: '░'
  }, cliProgress.Presets.shades_classic);
  
  // Map to track progress bars
  const progressBars = new Map<string, any>();
```

**Step 3: Modify Child Execution (3:30-4:30 PM)**

Replace the existing child execution loop (around line 140-200):

```typescript
  // Launch all children with streaming
  const childPromises = subtasks.map(async (subtask, index) => {
    const childId = uuidv4();
    const childTask: TaskStatus = {
      id: childId,
      prompt: subtask,
      status: 'pending',
      startTime: new Date(),
      temporalStartTime: execSync('date', { encoding: 'utf-8' }).trim(),
      depth: rootTask.depth + 1,
      parentTask: rootTaskId,
      childTasks: [],
      taskType: rootTask.taskType,
      taskTypeId: rootTask.taskTypeId,
      systemPrompt: rootTask.systemPrompt,
    };
    
    statusManager.addTask(childTask);
    
    // Create progress bar for this child
    const bar = multibar.create(100, 0, {
      taskId: childId.slice(0, 8),
      lines: 0,
      interventions: 0
    });
    progressBars.set(childId, bar);
    
    // Update progress on aggregator events
    const updateProgress = (event: any) => {
      if (event.taskId === childId) {
        const progress = Math.min((event.lines / 50) * 100, 90); // Estimate progress
        bar.update(progress, {
          lines: event.lines,
          interventions: event.interventions || 0
        });
      }
    };
    
    aggregator.on('stats', updateProgress);
    
    // Determine executor type
    const childPrompt = `CRITICAL: You must implement actual code, not just describe it.\n\n${subtask}`;
    const useChildInteractive = needsInteractiveExecution(childPrompt);
    
    try {
      // Create executor but don't await yet
      let executorPromise: Promise<string>;
      
      if (useChildInteractive) {
        // Create PTY executor
        const executor = new PtyExecutor({
          cwd: process.cwd(),
          enableMonitoring: true,
          enableIntervention: true,
        });
        
        // Attach to aggregator BEFORE execution
        aggregator.attachChild(childId, executor);
        
        // Now execute
        executorPromise = executeWithPty(childPrompt, childId, systemPrompt, conversationDB);
      } else {
        // Create SDK executor
        const executor = new SdkExecutor({
          cwd: process.cwd(),
          systemPrompt: systemPrompt,
          maxTurns: 10
        });
        
        // Attach to aggregator
        aggregator.attachChild(childId, executor);
        
        // Execute
        executorPromise = executeWithSdk(childPrompt, childId, systemPrompt, conversationDB);
      }
      
      // Handle completion asynchronously
      executorPromise
        .then(output => {
          bar.update(100, { status: 'completed' });
          statusManager.updateTask(childId, {
            status: 'completed',
            output: output,
            temporalEndTime: execSync('date', { encoding: 'utf-8' }).trim(),
          });
        })
        .catch(error => {
          bar.update(100, { status: 'failed' });
          console.error(chalk.red(`\n[${childId.slice(0,8)}] Failed: ${error.message}\n`));
          statusManager.updateTask(childId, {
            status: 'failed',
            error: error.message,
            temporalEndTime: execSync('date', { encoding: 'utf-8' }).trim(),
          });
        });
      
      // Return the promise for optional waiting
      return executorPromise;
      
    } catch (error) {
      console.error(chalk.red(`\n[${childId.slice(0,8)}] Setup failed: ${error}\n`));
      throw error;
    }
  });
```

**Step 4: Implement Return Logic (4:30-5:30 PM)**

```typescript
  // Check if we should return immediately
  if (input.returnImmediately !== false) {
    // Return immediately with streaming info
    return {
      content: [{
        type: 'text',
        text: `🚀 **Verbose Master Mode Active!**

**Parent task completed successfully:**
- Created ${newFiles.length} files
- Generated ${subtasks.length} subtasks

**Now executing in parallel:**
${subtasks.map((task, i) => `${i+1}. [${childPromises[i].taskId?.slice(0,8) || 'pending'}] ${task.slice(0,60)}...`).join('\n')}

**Real-time output streaming to console with task prefixes.**

You'll see:
- \`[taskId]\` prefixed output from each child
- \`[INTERVENTION]\` messages when violations detected
- Progress bars showing execution status
- Completion notifications as tasks finish

**Continue working while tasks execute in background.**

To check status later:
\`\`\`
axiom_mcp_observe({ mode: "recent", limit: 20 })
\`\`\`

To see the conversation tree:
\`\`\`
axiom_mcp_observe({ 
  mode: "tree", 
  conversationId: "${rootTaskId}" 
})
\`\`\``
      }]
    };
  } else {
    // Wait for all children to complete
    console.error(chalk.gray('\n[MASTER] Waiting for all children to complete...\n'));
    
    try {
      const results = await Promise.allSettled(childPromises);
      
      multibar.stop();
      
      // Summary statistics
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.error(chalk.cyan('\n' + '━'.repeat(60)));
      console.error(chalk.green(`✓ Completed: ${successful} tasks`));
      if (failed > 0) {
        console.error(chalk.red(`✗ Failed: ${failed} tasks`));
      }
      console.error(chalk.cyan('━'.repeat(60) + '\n'));
      
      return formatSpawnResult(rootTask, statusManager);
    } catch (error) {
      multibar.stop();
      throw error;
    }
  }
}
// Close the verbose mode if block
```

**5:30-6:00 PM: Build and Initial Testing**

```bash
# Save all files
git add -A
git status  # Review changes

# Build the project
npm run build:v3

# If there are TypeScript errors, fix them:
# - Missing imports
# - Type mismatches  
# - Undefined variables

# Once build succeeds, test with MCP inspector
npx @modelcontextprotocol/inspector dist-v3/index.js
```

Test the verbose mode with a simple task:
```typescript
axiom_mcp_spawn({
  parentPrompt: "Create a simple hello world in Python and JavaScript",
  spawnPattern: "parallel",
  spawnCount: 2,
  verboseMasterMode: true
})
```

Expected output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    VERBOSE MASTER MODE - PARALLEL EXECUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Parent: Create a simple hello world in Python and JavaScript
Pattern: parallel | Children: 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[abc12345] Starting execution...
[def67890] Starting execution...
[abc12345] Creating hello_world.py...
[def67890] I'll create a hello world in JavaScript...
```

**End of Day Commit**:
```bash
git add -A
git commit -m "feat(verbose-mode): Implement StreamAggregator and parallel streaming

- Add StreamAggregator class for multiplexing child output
- Update axiom-mcp-spawn schema with verboseMasterMode flag
- Integrate streaming with progress bars and interventions
- Add comprehensive unit tests
- Non-blocking execution with immediate return option

Part of verbose master mode implementation (Day 1/5)"

git push origin verbose-mode-day-1
```

### Day 2: Integration (8 hours)

#### Morning (4 hours)
1. **PTY Executor Integration** (2 hours)
   - Modify child execution to use aggregator
   - Ensure interventions visible
   - Test with interactive tasks

2. **SDK Executor Integration** (2 hours)
   - Handle SDK delta events
   - Format SDK output appropriately
   - Test with non-interactive tasks

#### Afternoon (4 hours)
3. **Error Handling** (2 hours)
   - Graceful stream cleanup
   - Error prefix formatting
   - Timeout handling

4. **Performance Testing** (2 hours)
   - Test with 10 parallel children
   - Monitor memory usage
   - Verify no blocking

### Day 3: Polish & Documentation (8 hours)

#### Morning (4 hours)
1. **Output Formatting** (2 hours)
   - Color coding (optional)
   - Timestamp options
   - Progress indicators
   - Clean line wrapping

2. **Configuration System** (2 hours)
   ```typescript
   // New file: src-v3/config/verbose-mode-config.ts
   export interface VerboseModeConfig {
     outputStream: 'stderr' | 'stdout' | 'file';
     includeTimestamps: boolean;
     colorizeOutput: boolean;
     maxOutputPerTask: number;
     prefixLength: number;
   }
   ```

#### Afternoon (4 hours)
3. **Update Documentation** (2 hours)
   - Update CLAUDE.md with examples
   - Add to verification checklist
   - Create user guide section

4. **Integration Tests** (2 hours)
   ```typescript
   // New file: src-v3/__tests__/verbose-mode-integration.test.ts
   test('parallel execution with verbose mode')
   test('intervention visibility')
   test('mixed executor types')
   test('error handling')
   ```

### Day 4: GitHub & Memory Updates (4 hours)

1. **GitHub Issue Update** (1 hour)
   ```markdown
   # Update on pfin/nova-mcp#1
   
   ## Verbose Master Mode Implementation
   
   ### Completed
   - [x] Stream aggregator component
   - [x] Non-blocking execution
   - [x] Prefixed output streaming
   - [x] Integration with interventions
   
   ### Results
   - Child task visibility achieved
   - Parallel execution observable
   - System usability improved 10x
   
   ### Next: Phase 2 (Worker Threads)
   ```

2. **Nova Memory Documentation** (2 hours)
   ```bash
   mcp__nova-memory__write_note({
     title: "Axiom MCP v3 Verbose Mode Implementation",
     folder: "projects/axiom-mcp",
     content: "# Key Insights from Implementation...",
     tags: ["axiom-mcp", "streaming", "parallel-execution"]
   })
   ```

3. **Update CLAUDE.md** (1 hour)
   - New status section
   - Updated examples
   - Document pointers
   - Clear next steps

### Day 5: Cleanup & Testing (4 hours)

1. **Remove Orphaned Files** (1 hour)
   ```bash
   # Archive old docs
   mkdir -p docs/archive/2025-07
   mv docs/*_OLD.md docs/archive/2025-07/
   
   # Remove duplicates
   rm IMPLEMENTATION_PLAN_*.md
   rm RESEARCH_FINDINGS_*.md
   ```

2. **Final Testing** (2 hours)
   - Full system test
   - Performance benchmarks
   - Create demo video/GIF

3. **Commit & Tag** (1 hour)
   ```bash
   git add -A
   git commit -m "feat: Implement Verbose Master Mode for parallel visibility

   - Add StreamAggregator for real-time child output
   - Non-blocking execution with prefixed streams  
   - Full intervention visibility
   - Improves debugging and monitoring

   Closes #1 (Phase 1)"
   
   git tag v0.6.0-verbose-mode
   git push origin main --tags
   ```

## File Structure After Implementation

```
axiom-mcp/
├── src-v3/
│   ├── aggregators/
│   │   ├── stream-aggregator.ts      # NEW: Core streaming component
│   │   └── __tests__/
│   │       └── stream-aggregator.test.ts
│   ├── config/
│   │   ├── task-types.ts
│   │   └── verbose-mode-config.ts    # NEW: Configuration options
│   ├── tools/
│   │   └── axiom-mcp-spawn.ts        # MODIFIED: Verbose mode support
│   └── __tests__/
│       └── verbose-mode-integration.test.ts  # NEW: Integration tests
├── docs/
│   ├── AXIOM_V3_MASTER_PLAN.md       # THIS FILE
│   ├── AXIOM_V3_VERIFICATION_CHECKLIST.md
│   ├── AXIOM_V3_TECHNICAL_REFERENCE_GUIDE.md
│   ├── VERBOSE_MASTER_MODE_IMPLEMENTATION_PLAN.md
│   └── archive/                       # NEW: Old docs moved here
└── CLAUDE.md                          # UPDATED: Current status
```

## Success Metrics

### Quantitative
- [ ] 10+ parallel children visible
- [ ] <100ms output latency
- [ ] 0% CPU when idle
- [ ] <50MB memory overhead
- [ ] 100% intervention visibility

### Qualitative
- [ ] "I can see what's happening!"
- [ ] "Debugging is 10x easier"
- [ ] "The system feels alive"
- [ ] "I trust it's working"

## Risk Mitigation

| Risk | Mitigation | Owner |
|------|------------|-------|
| Output overflow | Max buffer limits | StreamAggregator |
| Performance impact | Benchmarking, profiling | Tests |
| Breaking changes | Feature flag (off by default) | Schema |
| Lost messages | Database still captures all | Existing |

## Phase 2 Preview: Worker Threads

After Verbose Mode success:
1. Move execution to worker threads
2. True parallel execution
3. CPU isolation
4. Crash resilience

## Phase 3 Preview: MCTS Integration

After parallelism:
1. Score each path
2. Learn from successes
3. Prune bad branches
4. Synthesize best solutions

## Communication Plan

### Daily Updates
```bash
# End of each day
mcp__nova-memory__write_note({
  title: `Axiom MCP Daily Progress ${new Date().toISOString().split('T')[0]}`,
  folder: "projects/axiom-mcp/daily",
  content: "Today's progress on Verbose Master Mode..."
})
```

### GitHub Milestone
- Create Milestone: "Verbose Master Mode"
- Link Issue #1
- Track progress daily

### Documentation Standards
1. Every file must reference this master plan
2. Use relative links between docs
3. Keep CLAUDE.md updated with latest status
4. Archive old docs, don't delete

## Definition of Done

### Verbose Master Mode Complete When:
1. ✅ All child output visible with prefixes
2. ✅ Non-blocking execution verified  
3. ✅ Interventions clearly visible
4. ✅ All tests passing
5. ✅ Documentation updated
6. ✅ GitHub issue updated
7. ✅ Nova memory has implementation notes
8. ✅ CLAUDE.md reflects new status
9. ✅ Old docs archived
10. ✅ Tagged release created

## Next Steps After Verbose Mode

1. **Worker Thread Implementation** (1 week)
   - True parallelism
   - Resource isolation
   - Crash resilience

2. **MCTS Wiring** (1 week)
   - Connect rewards
   - Path selection
   - Learning system

3. **Port Communication** (3 days)
   - Agent messaging
   - Coordination protocols
   - Swarm behaviors

## Conclusion

This plan takes Axiom MCP from 35% to 70% completion by implementing the most critical missing piece: visibility. By following this detailed plan, we'll transform a silent, opaque system into a transparent, observable, and trustworthy development platform.

**Remember**: "Architecture isn't implementation. Components in isolation achieve nothing. Integration is everything."

---

*Master Plan Version 1.0*  
*Created: July 7, 2025*  
*Next Review: After Verbose Mode Complete*  
*Owner: Axiom MCP Team*