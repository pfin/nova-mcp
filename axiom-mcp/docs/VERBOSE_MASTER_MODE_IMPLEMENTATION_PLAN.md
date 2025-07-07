# Verbose Master Mode: Complete Implementation Plan

## Executive Summary

Verbose Master Mode solves the critical visibility problem in Axiom MCP v3 by streaming all child task output in real-time with prefixed identifiers. This transforms the silent, blocking execution into an observable, non-blocking parallel execution system.

## Problem Statement

Current issues (verified in docs/AXIOM_V3_VERIFICATION_CHECKLIST.md):
- Child tasks execute silently with no visibility
- Blocking execution prevents continued work
- Interventions happen but can't be observed
- No way to debug failures in real-time
- System waits for all children before returning

## Solution Architecture

### Core Concept
```
Current: Parent → [Silent Children] → Wait → Final Report
Verbose: Parent → [Streaming Children with Prefixes] → Immediate Return → Live Monitoring
```

### Integration with Existing Components

Based on docs/AXIOM_V3_COMPONENT_CROSS_REFERENCE.md analysis:

**Components to Connect:**
- ✅ PTY Executor (already emits 'data' events)
- ✅ SDK Executor (already emits 'delta' events)  
- ✅ Stream Parser (already parses output)
- ✅ Rule Verifier (already checks violations)
- ✅ Conversation DB (already stores streams)
- 🆕 Stream Aggregator (new component needed)

## Detailed Implementation Plan

### Phase 1: Schema Update

```typescript
// In src-v3/tools/axiom-mcp-spawn.ts
export const axiomMcpSpawnSchema = z.object({
  parentPrompt: z.string().describe('The main task that will spawn subtasks'),
  spawnPattern: z.enum(['decompose', 'parallel', 'sequential', 'recursive']),
  spawnCount: z.number().min(1).max(10).default(3),
  maxDepth: z.number().min(1).max(5).default(3),
  autoExecute: z.boolean().default(true),
  verboseMasterMode: z.boolean().default(false).describe('Stream all child output in real-time')
});
```

### Phase 2: Stream Aggregator Component

```typescript
// New file: src-v3/aggregators/stream-aggregator.ts
import { EventEmitter } from 'events';
import { PtyExecutor } from '../executors/pty-executor.js';
import { SdkExecutor } from '../executors/sdk-executor.js';
import { StreamParser } from '../parsers/stream-parser.js';
import { RuleVerifier } from '../verifiers/rule-verifier.js';
import { ConversationDB } from '../database/conversation-db.js';

export class StreamAggregator extends EventEmitter {
  private activeStreams: Map<string, {
    executor: PtyExecutor | SdkExecutor;
    startTime: number;
    lineBuffer: string;
  }> = new Map();
  
  constructor(
    private streamParser: StreamParser,
    private ruleVerifier: RuleVerifier | null,
    private conversationDB: ConversationDB | null,
    private outputStream: NodeJS.WriteStream = process.stderr
  ) {
    super();
  }
  
  attachChild(taskId: string, executor: PtyExecutor | SdkExecutor): void {
    const prefix = `[${taskId.slice(0,8)}]`;
    
    this.activeStreams.set(taskId, {
      executor,
      startTime: Date.now(),
      lineBuffer: ''
    });
    
    // Log child start
    this.outputStream.write(`${prefix} Starting execution...\n`);
    
    if (executor instanceof PtyExecutor) {
      this.attachPtyExecutor(taskId, executor, prefix);
    } else if (executor instanceof SdkExecutor) {
      this.attachSdkExecutor(taskId, executor, prefix);
    }
  }
  
  private attachPtyExecutor(taskId: string, executor: PtyExecutor, prefix: string): void {
    const state = this.activeStreams.get(taskId)!;
    
    executor.on('data', async (event) => {
      if (event.type === 'data') {
        // Buffer and emit complete lines with prefix
        state.lineBuffer += event.payload;
        const lines = state.lineBuffer.split('\n');
        state.lineBuffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            this.outputStream.write(`${prefix} ${line}\n`);
          }
        }
        
        // Still do all the parsing and verification
        const events = this.streamParser.parse(event.payload);
        
        // Store in database if available
        if (this.conversationDB) {
          this.conversationDB.createStream({
            id: uuidv4(),
            conversation_id: taskId,
            chunk: event.payload,
            parsed_data: events.length > 0 ? { events } : undefined,
            timestamp: new Date().toISOString(),
          }).catch(err => console.error(`${prefix} Stream storage error:`, err));
        }
        
        // Real-time intervention visibility
        if (this.ruleVerifier && events.length > 0) {
          // Existing intervention logic already writes to executor
          // We'll see it in the output stream
        }
      }
    });
    
    executor.on('error', (event) => {
      this.outputStream.write(`${prefix} ERROR: ${event.payload}\n`);
    });
    
    executor.on('exit', (event) => {
      // Flush any remaining buffer
      if (state.lineBuffer) {
        this.outputStream.write(`${prefix} ${state.lineBuffer}\n`);
      }
      this.detachChild(taskId);
    });
  }
  
  private attachSdkExecutor(taskId: string, executor: SdkExecutor, prefix: string): void {
    executor.on('delta', (event) => {
      if (event.payload?.messageType === 'assistant') {
        this.outputStream.write(`${prefix} [SDK] Assistant message received\n`);
        // Parse assistant message content for better display
        if (event.payload.content) {
          const content = JSON.stringify(event.payload.content);
          this.outputStream.write(`${prefix} ${content.slice(0, 200)}...\n`);
        }
      } else {
        this.outputStream.write(`${prefix} [SDK] ${event.payload?.messageType || 'unknown'}\n`);
      }
    });
    
    executor.on('complete', (event) => {
      this.outputStream.write(`${prefix} [SDK] Complete. Messages: ${event.payload?.messageCount}\n`);
      this.detachChild(taskId);
    });
    
    executor.on('error', (event) => {
      this.outputStream.write(`${prefix} [SDK] ERROR: ${event.payload}\n`);
      this.detachChild(taskId);
    });
  }
  
  detachChild(taskId: string): void {
    const state = this.activeStreams.get(taskId);
    if (state) {
      const duration = Date.now() - state.startTime;
      const prefix = `[${taskId.slice(0,8)}]`;
      this.outputStream.write(`${prefix} Execution completed in ${(duration/1000).toFixed(1)}s\n`);
      this.activeStreams.delete(taskId);
      this.emit('child-complete', { taskId, duration });
    }
  }
  
  getActiveCount(): number {
    return this.activeStreams.size;
  }
}
```

### Phase 3: Integration in axiom-mcp-spawn.ts

```typescript
// Modifications to handleAxiomMcpSpawn function

import { StreamAggregator } from '../aggregators/stream-aggregator.js';

export async function handleAxiomMcpSpawn(
  input: AxiomMcpSpawnInput,
  statusManager: StatusManager,
  conversationDB?: ConversationDB
): Promise<{ content: Array<{ type: string; text: string }> }> {
  
  // ... existing setup code ...
  
  // Check if verbose mode requested
  if (input.verboseMasterMode) {
    console.error('[SPAWN] Verbose Master Mode activated - streaming all output');
    
    // Create aggregator
    const aggregator = new StreamAggregator(
      new StreamParser(),
      conversationDB ? new RuleVerifier(conversationDB) : null,
      conversationDB,
      process.stderr // Output stream
    );
    
    // Track completion
    let completedCount = 0;
    aggregator.on('child-complete', ({ taskId, duration }) => {
      completedCount++;
      console.error(`[MASTER] Progress: ${completedCount}/${subtasks.length} tasks completed`);
    });
    
    // Execute parent task first (unchanged)
    const spawnResult = useInteractive 
      ? await executeWithPty(spawnPrompt, rootTaskId, systemPrompt, conversationDB)
      : await executeWithSdk(spawnPrompt + (systemPrompt ? `\n\nSystem: ${systemPrompt}` : ''), rootTaskId, systemPrompt, conversationDB);
    
    // Parse subtasks
    const subtasks = parseSubtasks(spawnResult);
    
    // Start all children WITHOUT waiting
    const childExecutions = subtasks.map((subtask, index) => {
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
      
      // Create executor based on task type
      const childPrompt = `CRITICAL: You must implement actual code, not just describe.\n\n${subtask}`;
      const useChildInteractive = needsInteractiveExecution(childPrompt);
      
      // Create appropriate executor but DON'T execute yet
      const executor = useChildInteractive
        ? new PtyExecutor({
            cwd: process.cwd(),
            enableMonitoring: true,
            enableIntervention: true,
          })
        : new SdkExecutor({
            cwd: process.cwd(),
            systemPrompt: systemPrompt,
            maxTurns: 10
          });
      
      // Attach to aggregator BEFORE execution
      aggregator.attachChild(childId, executor);
      
      // Now start execution (custom logic for each executor type)
      let executionPromise: Promise<string>;
      
      if (useChildInteractive) {
        // For PTY, we need to handle the execution manually
        executionPromise = new Promise(async (resolve, reject) => {
          try {
            // Set up all the intervention logic
            let output = '';
            let hasError = false;
            let lastFileCheckTime = Date.now();
            let planningStartTime: number | null = null;
            let hasCreatedFiles = false;
            let interventionCount = 0;
            
            executor.on('data', async (event) => {
              if (event.type === 'data') {
                output += event.payload;
                // Intervention logic already in executeWithPty
              }
            });
            
            executor.on('error', (event) => {
              hasError = true;
            });
            
            // Build command and execute
            const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${childPrompt}` : childPrompt;
            const tempFile = `/tmp/axiom-prompt-${childId}.txt`;
            await fs.writeFile(tempFile, fullPrompt);
            
            await executor.execute('bash', ['-c', `cat "${tempFile}" | claude`], childId);
            
            await fs.unlink(tempFile).catch(() => {});
            
            if (hasError) {
              reject(new Error('Execution failed with errors'));
            } else {
              resolve(output);
            }
          } catch (error) {
            reject(error);
          } finally {
            executor.cleanup();
          }
        });
      } else {
        // For SDK executor
        executionPromise = executor.execute(childPrompt, childId)
          .then(() => executor.getFinalResponse());
      }
      
      // Handle completion/failure
      executionPromise
        .then(output => {
          statusManager.updateTask(childId, {
            status: 'completed',
            output: output,
            temporalEndTime: execSync('date', { encoding: 'utf-8' }).trim(),
          });
          
          if (conversationDB) {
            conversationDB.updateConversationStatus(childId, 'completed')
              .catch(err => console.error('[DB] Status update failed:', err));
          }
        })
        .catch(error => {
          statusManager.updateTask(childId, {
            status: 'failed',
            error: error.message,
            temporalEndTime: execSync('date', { encoding: 'utf-8' }).trim(),
          });
          
          if (conversationDB) {
            conversationDB.updateConversationStatus(childId, 'failed')
              .catch(err => console.error('[DB] Status update failed:', err));
          }
        });
      
      return {
        childId,
        subtask,
        promise: executionPromise,
        executor
      };
    });
    
    // Return immediately with streaming info
    return {
      content: [{
        type: 'text',
        text: `🚀 Verbose Master Mode Active!
        
Parent task completed. Created ${newFiles.length} files:
${newFiles.map(f => `  - ${f}`).join('\n')}

Now spawning ${childExecutions.length} child tasks in parallel:
${childExecutions.map((c, i) => `  [${c.childId.slice(0,8)}] Task ${i+1}: ${c.subtask.slice(0,60)}...`).join('\n')}

All output is streaming to the console with prefixed task IDs.
Execution continues in background. You'll see:
  • Real-time output from all children
  • [INTERVENTION] messages when violations detected  
  • [PROGRESS CHECK] messages for slow tasks
  • Completion notifications as tasks finish

You can continue working while tasks execute.
Use axiom_mcp_observe({ mode: "recent" }) to check status.`
      }]
    };
    
  } else {
    // Original blocking implementation remains unchanged
    // ... existing code ...
  }
}
```

### Phase 4: Output Examples

#### Expected Console Output
```
[SPAWN] Verbose Master Mode activated - streaming all output
[SPAWN] Executing parent task with PTY to generate 3 subtasks...
[SPAWN] Created 1 new files: factorial_design.md
[SPAWN] Generated 3 subtasks

[abc12345] Starting execution...
[def67890] Starting execution...  
[ghi23456] Starting execution...
[abc12345] [PTY] Executing task abc12345 with prompt length: 256
[def67890] [SDK] Executing task def67890 with SDK executor
[abc12345] I'll create a Python implementation of factorial...
[ghi23456] [PTY] Executing task ghi23456 with prompt length: 248
[def67890] [SDK] Assistant message received
[def67890] {"type":"text","text":"Creating factorial.js with iterative approach..."}
[abc12345] [PROGRESS CHECK] No files created yet. Remember to write actual code files...
[abc12345] You're right, let me create factorial.py now:
[abc12345] ```python
[abc12345] def factorial(n):
[abc12345]     if n < 0:
[abc12345]         raise ValueError("Factorial undefined for negative numbers")
[ghi23456] Creating a Java implementation with recursion...
[abc12345]     result = 1
[abc12345]     for i in range(1, n + 1):
[abc12345]         result *= i
[def67890] [SDK] Complete. Messages: 4
[def67890] Execution completed in 3.2s
[MASTER] Progress: 1/3 tasks completed
[abc12345]     return result
[abc12345] ```
[abc12345] Saving to factorial.py...
[abc12345] [INTERVENTION] File creation detected - good progress!
[abc12345] Now let me add some tests...
[ghi23456] public class Factorial {
[ghi23456]     public static long factorial(int n) {
[ghi23456]         if (n <= 1) return 1;
[ghi23456]         return n * factorial(n - 1);
[ghi23456]     }
[abc12345] Execution completed in 8.7s
[MASTER] Progress: 2/3 tasks completed
[ghi23456] }
[ghi23456] Saving to Factorial.java...
[ghi23456] Execution completed in 9.1s
[MASTER] Progress: 3/3 tasks completed
```

### Phase 5: Testing Strategy

1. **Unit Tests for StreamAggregator**
   - Test prefix formatting
   - Test line buffering
   - Test multi-stream handling
   - Test detachment on completion

2. **Integration Tests**
   - Test with PTY executor
   - Test with SDK executor
   - Test mixed executor types
   - Test intervention visibility

3. **Performance Tests**
   - Verify no blocking
   - Check memory usage with many streams
   - Ensure no output loss

### Phase 6: Configuration Options

```typescript
interface VerboseModeConfig {
  outputStream: 'stderr' | 'stdout' | 'file';
  includeTimestamps: boolean;
  colorizeOutput: boolean;
  maxOutputPerTask: number; // Prevent runaway output
  interventionHighlight: boolean;
}
```

## Benefits

1. **Real-time Visibility**: See everything as it happens
2. **Non-blocking**: Continue working while tasks run
3. **Debugging**: Understand failures immediately
4. **Intervention Monitoring**: Watch the system self-correct
5. **Parallel Awareness**: See all children working simultaneously

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Output overflow | Implement max buffer size per task |
| Interleaved output | Line buffering with clear prefixes |
| Performance impact | Optional feature, off by default |
| Lost output on crash | Database still captures everything |

## Success Criteria

1. All child output visible with task prefixes
2. Non-blocking execution verified
3. Interventions clearly visible in stream
4. No performance degradation when disabled
5. Database still captures all data

## Timeline

- **Day 1**: Schema update and StreamAggregator class
- **Day 2**: Integration with axiom-mcp-spawn
- **Day 3**: Testing and output formatting
- **Day 4**: Documentation and examples
- **Day 5**: Performance optimization

## Conclusion

Verbose Master Mode transforms Axiom MCP from a blind executor into a transparent, observable system. By connecting our existing components (PTY/SDK executors, stream parser, interventions) through a new StreamAggregator, we achieve real-time visibility without architectural changes.

This is the missing link that makes the system truly usable for development.

---

*Implementation Plan Version 1.0*  
*Created: July 7, 2025*  
*Target: Immediate implementation*