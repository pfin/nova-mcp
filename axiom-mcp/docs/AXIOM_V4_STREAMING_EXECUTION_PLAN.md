# Axiom V4 Streaming Execution Plan

## Goal
Transform Axiom from blocking execution to Claude-chat-like streaming where users see output in real-time and can interrupt at any time.

## Step-by-Step Implementation Plan

### Phase 1: Understand MCP Streaming (30 min)
**Goal**: Learn how MCP supports streaming responses

#### Step 1.1: Research MCP SDK Streaming
- [ ] Check MCP SDK documentation for streaming support
- [ ] Look at `@modelcontextprotocol/sdk` for streaming examples
- [ ] Find how to send partial responses while execution continues

#### Step 1.2: Test Simple Streaming
- [ ] Create minimal test that streams "Hello" then "World" with delay
- [ ] Verify Claude receives partial messages
- [ ] Confirm we can send multiple response chunks

### Phase 2: Modify Orchestrator for Non-Blocking (1 hour)
**Goal**: Make orchestrator return immediately while execution continues

#### Step 2.1: Split Execution from Response
```typescript
// Current (blocking):
const result = await executor.execute(prompt);
return { content: [{ type: "text", text: result }] };

// Target (non-blocking):
const streamId = startStreaming(executor, prompt);
return { content: [{ type: "text", text: `Started task ${taskId}` }] };
```

#### Step 2.2: Create Stream Manager
- [ ] Create `StreamManager` class to track active streams
- [ ] Store PTY output buffers per task
- [ ] Handle multiple concurrent streams

#### Step 2.3: Implement Background Execution
- [ ] Move executor.execute to background promise
- [ ] Set up output collection in PTY onData handler
- [ ] Create mechanism to send chunks back to Claude

### Phase 3: Implement MCP Response Streaming (2 hours)
**Goal**: Stream PTY output through MCP protocol

#### Step 3.1: Modify Tool Response Handler
- [ ] Change from single response to streaming response
- [ ] Use MCP SDK's streaming capabilities
- [ ] Send chunks as they arrive from PTY

#### Step 3.2: Create Output Formatter
- [ ] Format PTY output for Claude (prefix with task ID)
- [ ] Detect and highlight file creation events
- [ ] Mark intervention points clearly

#### Step 3.3: Test End-to-End Streaming
- [ ] Call axiom_spawn with simple prompt
- [ ] Verify output appears character-by-character
- [ ] Confirm Claude shows output in real-time

### Phase 4: Add Interrupt Handling (1 hour)
**Goal**: Allow new messages to interrupt running tasks

#### Step 4.1: Detect Active Streams
- [ ] Check if task is still running when new request arrives
- [ ] Create interrupt decision logic
- [ ] Map new requests to task interrupts

#### Step 4.2: Implement Interrupt Mechanism
- [ ] Send Ctrl+C to PTY for current task
- [ ] Inject new command/direction
- [ ] Update stream to show interrupt happened

#### Step 4.3: Test Interrupt Flow
- [ ] Start long-running task
- [ ] Send new axiom_spawn while first is running
- [ ] Verify first task is interrupted
- [ ] Confirm new direction is followed

### Phase 5: Polish User Experience (1 hour)
**Goal**: Make it feel exactly like Claude chat

#### Step 5.1: Add Status Indicators
- [ ] Show [RUNNING] prefix while streaming
- [ ] Add [COMPLETED] when done
- [ ] Include timing information

#### Step 5.2: Improve Output Formatting
- [ ] Color code different types of output
- [ ] Highlight file operations
- [ ] Make interventions stand out

#### Step 5.3: Handle Edge Cases
- [ ] PTY command not found
- [ ] Network interruptions
- [ ] Simultaneous interrupts
- [ ] Clean shutdown

### Phase 6: Parallel Streaming (1 hour)
**Goal**: Support multiple Claude instances streaming simultaneously

#### Step 6.1: Modify for Multiple PTYs
- [ ] Create PTY pool management
- [ ] Assign unique IDs to each stream
- [ ] Merge outputs with clear labeling

#### Step 6.2: Test Parallel Execution
- [ ] Spawn 3 tasks simultaneously
- [ ] Verify all stream concurrently
- [ ] Test interrupting specific tasks

## Implementation Order

### Day 1 (Today)
1. **Morning**: Phase 1 & 2 - Understand streaming, make non-blocking
2. **Afternoon**: Phase 3 - Implement MCP streaming
3. **Evening**: Test and debug basic streaming

### Day 2
1. **Morning**: Phase 4 - Add interrupts
2. **Afternoon**: Phase 5 - Polish UX
3. **Evening**: Phase 6 - Parallel streaming

## Key Code Locations

### Files to Modify
1. `/src-v4/core/hook-orchestrator.ts` - Make handleRequest non-blocking
2. `/src-v4/index.ts` - Add streaming to tool response handler
3. `/src-v4/executors/pty-executor.ts` - Already streams, just need to connect
4. `/src-v4/core/stream-manager.ts` - New file for managing streams

### Critical Functions
```typescript
// In hook-orchestrator.ts
async handleRequest(tool: string, args: any): Promise<any> {
  // Must return immediately
  // Start streaming in background
}

// In index.ts  
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Must support streaming responses
  // Not just return final result
});

// New stream-manager.ts
class StreamManager {
  startStream(taskId: string, executor: any): void
  sendChunk(taskId: string, data: string): void  
  endStream(taskId: string): void
  interruptStream(taskId: string): void
}
```

## Success Criteria

1. **Streaming Works**: Output appears character-by-character in Claude
2. **Non-Blocking**: Can start multiple tasks without waiting
3. **Interrupts Work**: New messages interrupt running tasks
4. **UX Matches Chat**: Feels like talking to Claude
5. **Parallel Capable**: Multiple streams work simultaneously

## Potential Blockers

1. **MCP Streaming Limits**: Need to verify SDK supports our use case
2. **Claude CLI Behavior**: Ensure `claude` command works as expected
3. **PTY Buffer Management**: Handle large outputs gracefully
4. **Transport Limitations**: Stdio might have restrictions

## Testing Commands

```bash
# Test 1: Basic streaming
axiom_spawn({ prompt: "Write hello.py that counts to 10 slowly" })

# Test 2: Interrupt
axiom_spawn({ prompt: "Analyze all possible sorting algorithms in detail" })
# After 3 seconds:
axiom_spawn({ prompt: "Stop analyzing! Just implement quicksort.py" })

# Test 3: Parallel
axiom_spawn({ 
  prompt: "Implement fibonacci in Python, JavaScript, and Go",
  spawnCount: 3,
  parallel: true
})
```

This plan transforms Axiom into the streaming, interruptible system we envision - making it work exactly like the Claude chat experience.