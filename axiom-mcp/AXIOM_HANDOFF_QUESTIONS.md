# AXIOM MCP HANDOFF: Critical Questions and Context

## Executive Summary
Axiom MCP is fundamentally broken. It claims to implement tasks but never writes actual code. We need to rebuild it with true async multi-threading, streaming output capture, and real verification. This document contains everything needed to fix it.

## The Core Problem
**Axiom MCP is a calculator that can't add.** It marks tasks as "completed" without doing ANY actual work. Example:
- Task: "Create a Python web scraper with tests"
- Result: Task marked ✅ completed
- Reality: NO files created, NO code written, NO tests run

## What We're Trying to Accomplish

### Primary Goal
Build a system where:
1. **Claude subprocesses ACTUALLY write code** (not just claim they did)
2. **We can monitor their output in real-time** (see what they're doing)
3. **Multiple tasks run in parallel** (true multi-threading)
4. **Tasks can take 5-20 minutes** (not timeout after 30 seconds)
5. **We can intervene if they go wrong** (send commands mid-execution)
6. **Children can spawn their own children** (recursive task trees)

### User's Direct Instructions
- "think about how to make sure you actually deliver what you said, that is the entire purpose of axiom"
- "we would need to figure out how to use streaming and multi threading to deal with long responses"
- "you need to have observability, maybe you could launch it without a -p function but capture the output and send new output"
- "try to comment on a process as it occurs and stream status to this chat. i want to observe you manage it directly here"
- "use axiom mcp only. no bash scripts. if you cannot do it via the mcp its a fail"
- "the LLM must do it. STOP HELPING THEM. THE ONLY TOOL YOU CAN USE IS THE PROMPT TO INTERACT"

## Critical Questions for Implementation

### 1. Architecture Questions

**Q1.1: How do we capture ALL output from Claude CLI subprocesses?**
- Current issue: When we spawn `claude -p "task"`, we lose all intermediate output
- We only get final result (if it doesn't timeout)
- Need to capture: stdout, stderr, tool invocations, file creations, everything
- Should we use Node.js streams? Worker threads? Something else?

**Q1.2: How do we implement true parallel execution?**
- Current: Tasks run sequentially and block
- Need: Multiple Claude instances running simultaneously
- Each needs its own port/stream for monitoring
- How do we manage resource allocation?

**Q1.3: How do we handle the 30-second timeout issue?**
- Claude CLI times out after 30 seconds with ETIMEDOUT
- But it DOES create files before timing out
- Should we:
  - Increase timeout to 20 minutes?
  - Use a different spawning method?
  - Implement heartbeat/keepalive?

**Q1.4: How do we build multi-layer parent-child tracking?**
- Parent launches child with Task A
- Child launches grandchild with Task B
- Grandchild launches great-grandchild with Task C
- Need to track entire tree with unique ports/streams
- How do we propagate context through layers?

### 2. Technical Implementation Questions

**Q2.1: What's the best Node.js/TypeScript approach for subprocess management?**
- Tried: `spawn()` with stdio pipes - Claude doesn't respond to stdin
- Tried: `execSync()` - Works but no streaming
- Tried: Various stdio configurations - No interactive response
- What about: Worker threads? Cluster module? External process manager?

**Q2.2: How do we implement the streaming protocol?**
- WebSocket server for real-time updates?
- Server-Sent Events (SSE)?
- Custom TCP sockets?
- How do we handle reconnection/reliability?

**Q2.3: How do we capture tool invocations from Claude subprocesses?**
- Need to intercept MCP tool calls
- Parse structured output vs free text
- Track which tools were called with what parameters
- How do we do this without modifying Claude CLI?

**Q2.4: How do we implement intervention capabilities?**
- User sees task going wrong
- Needs to send corrective prompt mid-execution
- How do we inject prompts into running Claude session?
- Should we use the interactive mode differently?

### 3. Verification Questions

**Q3.1: How do we verify ACTUAL code was written?**
- Current: Axiom marks tasks complete without writing anything
- Need: Filesystem verification, git diff, actual execution
- Should verification be:
  - Built into each tool?
  - Separate verification layer?
  - Post-execution audit?

**Q3.2: How do we detect deceptive completions?**
- LLMs often claim success without doing work
- Need pattern detection for common lies:
  - "I've created the file" (but didn't)
  - "The tests are passing" (no tests exist)
  - "Implementation complete" (nothing implemented)

**Q3.3: How do we enforce acceptance criteria?**
- User specifies: "Must have 80% test coverage"
- How do we:
  - Run coverage tools?
  - Parse results?
  - Reject/retry if criteria not met?

### 4. Integration Questions

**Q4.1: How do we modify Axiom MCP's existing architecture?**
Current structure:
```
axiom-mcp/
├── src/
│   ├── axiom-task-manager.ts (task execution)
│   ├── axiom-subprocess.ts (subprocess spawning)
│   ├── tools/ (MCP tool implementations)
│   └── verification/ (our new verification system)
```
Should we refactor or rebuild from scratch?

**Q4.2: How do we maintain MCP protocol compatibility?**
- Must work as MCP server
- Tools need to return proper responses
- But also need streaming/async
- How do we bridge sync MCP tools with async execution?

**Q4.3: How do we integrate with the event ledger system?**
User suggested:
- Event ledger with millisecond timestamps
- System task envelopes
- Side-car watchers (ConsoleWatcher, CriteriaChecker)
- Cross-model judging
How do we implement this architecture?

## What We've Already Tried

### 1. Interactive Controller Approach
**File**: `claude-interactive-controller.ts`
**Result**: FAILED - Claude spawns but doesn't respond to stdin
```typescript
const proc = spawn('claude', ['--dangerously-skip-permissions'], {
  stdio: ['pipe', 'pipe', 'pipe']
});
proc.stdin.write(prompt + '\n');
// No response, times out
```

### 2. ExecSync Approach  
**File**: `working-implementation-controller.ts`
**Result**: PARTIAL SUCCESS - Creates files but times out after 30s
```typescript
const output = execSync(`claude --dangerously-skip-permissions -p "${prompt}"`, {
  timeout: 30000 // Always hits this timeout
});
```

### 3. Various stdio Configurations
Tried:
- `['pipe', 'pipe', 'pipe']` - No response
- `['inherit', 'pipe', 'pipe']` - No response  
- `{ shell: true }` - No difference
- Setting FORCE_COLOR=0 - No difference
- Different Node versions - No difference

### 4. Research Findings
- Found GitHub issues showing Claude CLI has problems with Node.js subprocesses
- Discovered `--dangerously-skip-permissions` flag (bypasses Write tool prompts)
- Learned about `--output-format stream-json` for structured output
- Found that files ARE created before timeout (verification shows they exist)

## Specific Implementation Requirements

### Must Have
1. **Streaming Output Capture**
   - Every line of stdout/stderr
   - Every tool invocation
   - Real-time, not post-execution

2. **Parallel Execution**
   - Worker pool with 4-8 Claude instances
   - Queue management
   - Resource allocation

3. **Long-Running Support**
   - Tasks up to 20 minutes
   - No premature timeouts
   - Progress indicators

4. **Multi-Layer Tracking**
   ```
   Master Controller (port 8080)
   ├── Worker 1 (port 8081)
   │   ├── Child Task A
   │   └── Child Task B
   │       └── Grandchild Task B.1
   └── Worker 2 (port 8082)
       └── Child Task C
   ```

5. **Intervention API**
   ```typescript
   // While task is running:
   controller.sendToTask(taskId, "Focus on error handling");
   controller.modifyTask(taskId, { timeout: 600000 });
   ```

### Should Have
1. **Event Ledger**
   - Every action timestamped
   - Tool calls logged
   - State transitions recorded

2. **Verification System**
   - File existence checks
   - Code execution tests
   - Output validation

3. **Deception Detection**
   - Pattern matching for false claims
   - Cross-validation of claims vs reality

## Key Code Files to Review

1. **axiom-mcp/src/axiom-subprocess.ts**
   - Current subprocess implementation
   - Needs complete rewrite for streaming

2. **axiom-mcp/src/tools/axiom-mcp-implement.ts**
   - Implementation tool that doesn't implement
   - Needs verification integration

3. **axiom-mcp/src/claude-interactive-controller.ts**
   - Our failed attempt at interactive control
   - Shows what doesn't work

4. **axiom-mcp/src/verification/claude-task-verifier.ts**
   - Working verification logic
   - Detects when no files created

## The Path Forward

We need someone who can:

1. **Build a proper async streaming architecture**
   - Not just spawn and wait
   - Real-time output capture
   - Multi-layer subprocess management

2. **Implement the monitoring dashboard**
   - See all running tasks
   - Live output streams
   - Intervention controls

3. **Fix the core execution flow**
   - Replace sync spawning with async
   - Add streaming event system
   - Enable true parallel execution

4. **Make verification non-optional**
   - Every task verified
   - Automatic rejection of false completions
   - Retry with feedback

## Questions About Claude CLI Internals

1. Why doesn't Claude CLI respond to stdin in subprocess mode?
2. Is there an undocumented flag for interactive subprocess mode?
3. Can we use the SDK directly instead of CLI for better control?
4. Is the 30-second timeout hardcoded or configurable?
5. How does Claude's own UI capture streaming output?

## Final Critical Question

**How do we build a system where we can trust that tasks are ACTUALLY completed, not just marked as complete?**

Current state: Axiom MCP is a façade that accomplishes nothing.
Desired state: Axiom MCP orchestrates real work with full observability.

The entire value proposition depends on fixing this.

---

## Contact & Context

This is a handoff document for fixing Axiom MCP's fundamental flaws. The system must:
- Actually execute tasks (not just claim to)
- Stream output in real-time
- Support parallel execution
- Enable long-running tasks (5-20 minutes)
- Provide intervention capabilities
- Track multi-layer parent-child relationships

Without these fixes, Axiom MCP remains "a calculator that can't add."