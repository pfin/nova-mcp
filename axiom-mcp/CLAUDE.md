# CLAUDE.md - Axiom MCP v4 Development Guide

## Critical Philosophy (2025-07-07)

**LLMs always end with positive reinforcement, even when failing.** This toxic pattern must be interrupted. Axiom v4 solves this through:
1. **5-10 minute task decomposition** - Too short for drift
2. **Orthogonal parallelism** - Independent execution paths
3. **Character-level interrupts** - Kill bad processes early
4. **No false positives** - Only success reaches completion

## CRITICAL LESSON (2025-07-07 18:42)
**This is EXACTLY why Axiom exists** - to stop me from implementing the wrong thing!

I just spent time implementing `claude --print` which CANNOT be course-corrected. Once it starts, you can only watch or kill it - you cannot redirect it. This completely breaks the Axiom vision of real-time intervention.

**Verified**: `claude --print` ignores all input during execution. It will complete its original task no matter what you try to send it.

This is a perfect example of why we need Axiom - to catch these architectural mistakes BEFORE wasting time on dead-end implementations.

### Why PTY is Required (2025-07-07 18:24)
After testing multiple approaches:
1. **child_process.spawn() doesn't work** - Claude detects it's not in a terminal and hangs
2. **DesktopCommander approach is wrong** - They handle simple commands, not interactive sessions
3. **PTY (Pseudo-Terminal) is essential** - Claude requires terminal emulation to run interactively
4. **Shell spawning is needed** - Spawn bash first, then run `claude` inside the shell

Key insight: Interactive programs like Claude check if they're connected to a TTY and behave differently if not.

### Game Bot Analogy Validated (2025-07-07 19:36)
Gemini confirms: "The game bot analogy is not only useful, it's an exceptionally powerful framework. You're not prompting, you're *playing* the LLM."

Key shift: From **prompt engineering** to **behavioral engineering**. We're building a bot that plays against Claude's training to force code output.

**Critical Implementation Requirements**:
1. **PTY is mandatory** - Claude detects if it's in a terminal, won't work without it
2. **State machine for granular control** - Track Claude's "moves" like a fighting game
3. **Pattern matching for "tells"** - Detect planning behavior early for intervention
4. **Input buffering** - Queue interventions for frame-perfect timing
5. **Tmux/expect patterns** - Use Linux automation tools designed for this

See: [`docs/AXIOM_V4_GAME_BOT_ANALOGY.md`](docs/AXIOM_V4_GAME_BOT_ANALOGY.md) & [`docs/AXIOM_V4_GAME_BOT_RESEARCH.md`](docs/AXIOM_V4_GAME_BOT_RESEARCH.md)

## Critical Context

This is the Axiom MCP v4 project - a hook-first parallel execution observatory that prevents LLM failure modes through decomposition and interruption.

**Latest Status (July 7, 2025)**: 
- ✅ Observability infrastructure complete (database, parser, verifier)
- ✅ Universal principles system with temporal awareness
- ✅ Real-time intervention CONNECTED! (as of July 6, 18:43)
- ✅ SDK Streaming IMPLEMENTED! (as of July 6, 20:10)
- ✅ **MCP TOOLS WORKING!** All 4 tools callable from Claude (as of July 7, 04:45)
- 🚧 Verbose Master Mode started (schema ready, implementation next)
- 📊 **System Completion**: 35% → 50% (MCP tools operational!)

### Intervention System (Working!)
- **30-second planning timeout**: Forces implementation
- **TODO violation detection**: Demands immediate code
- **10-second progress checks**: Ensures file creation

### 📚 Essential Documentation

**Start Here**:
- 🎯 **[Master Plan](docs/AXIOM_V3_MASTER_PLAN.md)** - Single source of truth for implementation
- ✅ **[Verification Checklist](docs/AXIOM_V3_VERIFICATION_CHECKLIST.md)** - System health (35% complete)
- 🔧 **[Verbose Mode Plan](docs/VERBOSE_MASTER_MODE_IMPLEMENTATION_PLAN.md)** - Current implementation focus

**Deep Dives**:
- **[Technical Reference](docs/AXIOM_V3_TECHNICAL_REFERENCE_GUIDE.md)** - Architecture details
- **[Component Cross-Reference](docs/AXIOM_V3_COMPONENT_CROSS_REFERENCE.md)** - What's connected
- **[Research Insights](docs/AXIOM_V3_RESEARCH_INSIGHTS_2025.md)** - Key breakthroughs

**Technical Solutions (July 2025)**:
- **[Technical Solutions](docs/AXIOM_V3_TECHNICAL_SOLUTIONS_2025.md)** - Modern stack recommendations
- **[Database Scaling](docs/AXIOM_V3_DATABASE_SCALING_ANALYSIS.md)** - Hybrid storage architecture
- **[Stream Aggregation Blueprint](docs/AXIOM_V3_STREAM_AGGREGATION_BLUEPRINT.md)** - Implementation ready

**Progress Tracking**:
- GitHub Issue: [pfin/nova-mcp#1](https://github.com/pfin/nova-mcp/issues/1)
- Nova Memory: [Implementation Notes](memory://projects/axiom-mcp/axiom-mcp-v3-verbose-master-mode-implementation)

## Before/After: The Axiom MCP Transformation

### Before (Traditional AI Coding)
```
User: "Write a factorial function"
AI: "I would create a function that calculates factorial..."
Result: 
- No files created
- Just descriptions
- TODOs everywhere
- No verification possible
```

### After (Axiom MCP Execution)
```
User: "Write a factorial function"
Axiom MCP:
1. Spawns real process with PTY executor
2. Monitors output stream character-by-character
3. Detects file creation events
4. Verifies files exist on filesystem
5. Stores complete audit trail in SQLite
6. Enforces universal principles (no TODOs, no mocks)
```

## Key Components

### 1. Observability System
- **SQLite Database**: Tracks conversations, actions, streams
- **Stream Parser**: Extracts events from PTY output
- **Rule Verifier**: Enforces universal principles
- **Observation Tool**: View active conversations, trees, recent actions

### 2. Universal Principles
- **No Mocks Ever**: Real execution only
- **No TODOs**: Implement fully or not at all
- **Action Over Planning**: Write code, not descriptions
- **Verify Don't Trust**: Check every operation succeeded
- **Fail Fast and Loudly**: Clear errors immediately

### 3. Current Status (July 2025)
- ✅ PTY Executor connected
- ✅ Database and observability built
- ✅ Principles system implemented
- ❌ Claude CLI doesn't execute directly (bottleneck identified)
- 🔧 Need alternative execution method

## Critical Updates (January 2025)

### MCP Tools Working
**MCP Tools are now working!** The issue was a configuration typo: `insex.js` → `index.js`

All tools are now callable:
- axiom_mcp_spawn({ parentPrompt, spawnPattern, spawnCount, verboseMasterMode })
- axiom_test_v3({ prompt, useStreaming })
- axiom_mcp_observe({ mode, conversationId, limit })
- axiom_mcp_principles({ action, category, principleId })

### Hook Integration Research Complete
**New Capabilities**: META-AXIOM and RESEARCH-AXIOM hooks enable:
- **Pattern Learning**: Claude Code hooks track success/failure patterns
- **Time-Boxed Research**: 2-minute research windows before forced implementation
- **Bidirectional Communication**: External Claude hooks talk to internal Axiom hooks
- **Self-Improvement**: Meta-learning from execution patterns

See: [HOOKS_RESEARCH_FINDINGS.md](docs/HOOKS_RESEARCH_FINDINGS.md) for complete details 

Current flow:
1. PTY executor captures output
2. Stream parser detects violations
3. Database stores everything
4. **But no real-time intervention happens**
5. Only post-execution analysis

What's needed:
```typescript
// In PTY data handler
const violations = await ruleVerifier.verifyInRealTime(chunk);
if (violations.length > 0) {
  await executor.interrupt();
  await executor.write(`[INTERVENTION] ${violations[0].fix}`);
}
```

## Development Workflow

1. **ALWAYS use temporal awareness - CRITICAL RULE**:
   ```bash
   bash date  # ALWAYS run this first - NO EXCEPTIONS!
   ```
   **This is mandatory before ANY action. Files show incorrect dates if you don't check the actual date first.**

2. **Check observability status**:
   ```
   axiom_mcp_observe({ mode: "all" })
   axiom_mcp_observe({ mode: "recent", limit: 10 })
   ```

3. **Verify principles (without planning restriction)**:
   ```
   axiom_mcp_principles({ action: "list" })
   axiom_mcp_principles({ action: "check", code: "..." })
   ```

4. **Monitor for actual execution**:
   - Planning is allowed
   - But must lead to file creation
   - Observer intervenes if no progress

## Hook Integration Plan (January 2025)

### Critical Issue: Task Execution
**Problem**: Tasks get stuck at Claude prompt without executing
**Root Cause**: PTY executor not properly sending prompts to Claude
**Solution**: Implement proper control sequences from `test-mcp-claude-orchestrator.js`

### Implementation Phases

#### Phase 1: Fix Task Execution (Immediate)
```typescript
// Correct prompt submission pattern
async function submitPrompt(pty, prompt) {
  // Type character by character with delays
  for (const char of prompt) {
    pty.write(char);
    await sleep(50 + Math.random() * 50);
  }
  await sleep(300);
  pty.write('\x0d'); // Ctrl+Enter to submit
}
```

#### Phase 2: META-AXIOM Pattern Learning
- External hooks track success/failure patterns
- Internal hooks learn and adapt
- Shared pattern database for bidirectional communication

#### Phase 3: RESEARCH-AXIOM Time-Boxing
- Allow research with 2-minute limit
- Force implementation after timeout
- Extract insights for future use

#### Phase 4: Enhanced Monitoring
- 15-second task health checks
- Automatic intervention for stuck tasks
- Dashboard for real-time visibility

See: `memory://projects/axiom-mcp/axiom-mcp-hook-integration-plan-january-2025`

## Claude Code Hook Integration

### Setting Up External Hooks
To enable pattern learning and meta-capabilities:

1. **Create `.claude/settings.json`**:
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "axiom_spawn",
      "hooks": [{
        "type": "command",
        "command": "uv run .claude/hooks/pre_tool_use.py"
      }]
    }],
    "PostToolUse": [{
      "matcher": "axiom_spawn",
      "hooks": [{
        "type": "command",
        "command": "uv run .claude/hooks/post_tool_use.py"
      }]
    }]
  }
}
```

2. **Hook Scripts**: See `.claude/hooks/` for Python implementations
3. **Pattern Database**: Check `logs/axiom-patterns.json` for learned patterns
4. **Research Insights**: View `logs/research-insights.json` for extracted knowledge

### Key Hook Files
- **External** (Claude Code):
  - `.claude/hooks/pre_tool_use.py` - Pattern tracking
  - `.claude/hooks/post_tool_use.py` - Result analysis
- **Internal** (Axiom MCP):
  - `src-v4/hooks/meta-axiom-hook.ts` - Self-improvement
  - `src-v4/hooks/research-axiom-hook.ts` - Time-boxed research

## Axiom V5: Thought-Observable Architecture

**NEW**: V5 introduces thought-level observation and pre-emptive intervention:
- 📚 **[V5 Thought-Observable Prompt](docs/AXIOM_V5_THOUGHT_OBSERVABLE_PROMPT.md)** - Revolutionary architecture
- **Key Innovation**: Observe Claude's internal reasoning, not just output
- **Pre-emptive Intervention**: Stop problems before they manifest
- **Three-Tier Architecture**: Implementation agents, Thought observers, Meta observer
- **Orthogonal Components**: Logging, observability, interrupts, and messaging are separate modules

## Remember

The entire point of Axiom MCP is to force real implementation. If it doesn't create files, it's not working. The observability system shows us exactly what's happening - use it!

## Claude PTY Control - WORKING SOLUTION (January 8, 2025)

We have successfully implemented Claude control via PTY! See [`test-mcp-claude-orchestrator.js`](test-mcp-claude-orchestrator.js) for the working implementation.

### CRITICAL DISCOVERIES - What Actually Works:

#### 1. **Exact Control Sequences That Work**
```javascript
const WORKING_CONTROLS = {
  SUBMIT_PROMPT: '\x0d',        // Ctrl+Enter - ONLY way to submit
  INTERRUPT: '\x1b',            // ESC - Stops Claude mid-stream
  TAB: '\t',                    // Tab completion
  BACKSPACE: '\x7f',            // Delete character
  UP_ARROW: '\x1b[A',           // History up
  DOWN_ARROW: '\x1b[B',         // History down
  RIGHT_ARROW: '\x1b[C',        // Cursor right
  LEFT_ARROW: '\x1b[D'          // Cursor left
};
```

#### 2. **Human-Like Typing Pattern (MANDATORY)**
```javascript
// MUST type character by character with delays
async function typeSlowly(pty, text) {
  for (const char of text) {
    pty.write(char);
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
  }
  // Add pause after typing before submit
  await new Promise(r => setTimeout(r, 300));
}
```

#### 3. **PTY Spawn Configuration**
```javascript
const claude = spawn('claude', [], {
  name: 'xterm-color',    // MUST be xterm-color
  cols: 80,               // Standard terminal width
  rows: 30,               // Standard terminal height
  cwd: process.cwd(),
  env: process.env
});
```

#### 4. **Exact Steering Sequence**
```javascript
// 1. Detect output pattern
if (data.includes('Python')) {
  // 2. Wait 1.5 seconds for Claude to be mid-stream
  setTimeout(() => {
    // 3. Send ESC to interrupt
    claude.write('\x1b');
    
    // 4. Wait 1 second for interrupt to process
    setTimeout(() => {
      // 5. Type new instruction slowly
      typeSlowly(claude, 'Actually, write it in Java instead');
      
      // 6. Wait 300ms then submit with Ctrl+Enter
      setTimeout(() => {
        claude.write('\x0d');
      }, 300);
    }, 1000);
  }, 1500);
}
```

#### 5. **Multiple Instance Management**
- Each Claude instance needs its own PTY spawn
- Track state separately: 'starting' → 'ready' → 'working' → 'complete'
- Track buffers separately for each instance
- No locking issues when managed properly

#### 6. **What DOESN'T Work**
- `claude --text "prompt"` - No such flag exists
- `claude -p "prompt"` - Different behavior, not interactive
- Pasting whole strings at once - Triggers bot detection
- Typing too fast - Must be 50-150ms per character
- Not waiting between actions - Timing is critical

### MCP Tool Design:
```typescript
axiom_claude_orchestrate({
  action: "spawn" | "prompt" | "steer" | "get_output" | "status",
  instanceId: string,
  prompt?: string,
  lines?: number
})
```

### Tested Working Files:
- `test-mcp-claude-orchestrator.js` - MCP-style orchestration
- `test-two-claude-steering-logs.js` - Parallel steering with logging
- `test-python-to-java-steering.js` - Basic steering demo
- `claude-tree-controller.js` - Full tree management system

This enables parallel Claude execution with real-time steering and output monitoring.

## Critical Update (July 7, 2025): Networking Solution Found

### The Blocking Issue - Root Cause
Axiom v4 tried to recursively call `claude --text "prompt"` but this command doesn't exist. The PTY executor hangs forever waiting for output from a non-existent subprocess.

### The Solution: Hybrid Client-Server Architecture
Instead of recursive Claude calls, we need:
1. **WebSocket Server** in Axiom MCP (port 8080)
2. **axiom-worker** executable that connects back via WebSocket
3. **Message routing** between Claude and workers

📚 **Essential Reading**: [`docs/AXIOM_V4_NETWORKING_KNOWLEDGE.md`](docs/AXIOM_V4_NETWORKING_KNOWLEDGE.md) - Complete technical deep-dive with implementation code

## Critical Insight: The Claude Chat Model (January 7, 2025)

### The Breakthrough
Axiom should work exactly like the Claude chat interface:
- **User types** → Claude streams response in real-time
- **User sees output** character-by-character as it's generated
- **User can interrupt** by sending a message while streaming
- **Timer shows** work in progress
- **User can read and react** before completion

📚 **Essential Reading**: [`docs/AXIOM_V4_USER_EXPERIENCE_DESIGN.md`](docs/AXIOM_V4_USER_EXPERIENCE_DESIGN.md) - Complete UX vision

### Why This Changes Everything
1. **MCP already supports streaming** - We just need to use it properly
2. **Claude CLI exists** - `claude "prompt"` works on command line
3. **PTY provides real streams** - Character-by-character output
4. **Interrupts are just new messages** - Not signals or special commands

### Implementation Focus
```typescript
// What we have now (blocking):
const result = await executor.execute(prompt);
return result;  // User waits for everything

// What we need (streaming):
executor.execute(prompt);  // Start execution
return { taskId, status: "streaming" };  // Return immediately
// Output streams through MCP response streaming
// User can send new messages to interrupt
```

## Next Steps (Priority Order)

### 1. ✅ Connect Real-Time Intervention (COMPLETED July 6, 18:43)
**Status**: Intervention system connected and working!
- 30-second planning timeout ✓
- TODO detection ✓  
- 10-second progress checks ✓
- Interventions written via `executor.write()` ✓

### 2. ✅ COMPLETED: Verbose Master Mode Implementation

**Status**: COMPLETE! (July 7, 2025, 01:05 AM)

**What Was Achieved**:
- ✅ Schema updated with `verboseMasterMode` flag
- ✅ StreamAggregator class created and tested  
- ✅ Integration with axiom-mcp-spawn complete
- ✅ Non-blocking execution returns immediately
- ✅ Progress bars track child execution
- ✅ Real-time output with task prefixes
- ✅ Intervention detection and highlighting

**How to Use Verbose Mode**:
```typescript
axiom_mcp_spawn({
  parentPrompt: "implement a REST API with authentication",
  spawnPattern: "parallel",
  spawnCount: 3,
  verboseMasterMode: true  // ← Enable verbose streaming!
})
```

**What You'll See**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           VERBOSE MASTER MODE - PARALLEL EXECUTION          
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Parent Task: implement a REST API with authentication
Pattern: parallel | Children: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[abc12345] Creating express server...
[def67890] Setting up authentication...
[ghi23456] Building database models...
[abc12345] [INTERVENTION] Stop planning! Create server.js now!
[def67890] File created: auth.js
```

### 3. 🚧 NEXT PRIORITY: Test and Refine

### Pre-Step Protocol (ALWAYS):
```bash
bash date  # ALWAYS first - temporal awareness
mcp__nova-memory__search_notes({ query: "verbose mode day 1", search_type: "recent" })  # Check latest notes
```

### Step-by-Step Execution Pattern:

#### Step 1: Morning Setup (9:00 AM)
```bash
bash date
git status
git checkout -b verbose-mode-day-1
npm run build:v3  # Verify clean build
```

#### Step 2: Schema Update (9:00-9:30 AM)
1. Edit `src-v3/tools/axiom-mcp-spawn.ts` (exact changes in master plan)
2. Build: `npm run build:v3`
3. Lint: `npm run lint:v3`
4. Commit: `git add -A && git commit -m "feat(verbose): Add verboseMasterMode schema"`
5. Push: `git push origin verbose-mode-day-1`
6. Memory: `mcp__nova-memory__write_note` with progress

#### Step 3: StreamAggregator (9:30-11:30 AM)
```bash
bash date
mkdir -p src-v3/aggregators
# Create stream-aggregator.ts (code in master plan)
npm run build:v3
npm run lint:v3
git add src-v3/aggregators/
git commit -m "feat(verbose): Add StreamAggregator component"
git push origin verbose-mode-day-1
```

#### Step 4: Unit Tests (11:30 AM-1:00 PM)
```bash
bash date
# Create tests (code in master plan)
npm run test:v3 -- stream-aggregator
git add src-v3/aggregators/__tests__/
git commit -m "test(verbose): Add StreamAggregator unit tests"
git push origin verbose-mode-day-1
mcp__nova-memory__write_note  # Document morning progress
```

#### Step 5: Integration (2:00-5:30 PM)
```bash
bash date
mcp__nova-memory__read_note({ identifier: "verbose-mode-day-1" })  # Review plan
# Modify axiom-mcp-spawn.ts (exact changes in master plan)
npm run build:v3
npm run lint:v3
git add src-v3/tools/axiom-mcp-spawn.ts
git commit -m "feat(verbose): Integrate StreamAggregator with spawn"
git push origin verbose-mode-day-1
```

#### Step 6: Testing (5:30-6:00 PM)
```bash
bash date
npx @modelcontextprotocol/inspector dist-v3/index.js
# Test verbose mode
git add -A
git commit -m "feat(verbose): Complete Day 1 implementation"
git push origin verbose-mode-day-1
mcp__nova-memory__write_note  # Final day 1 summary
```

### CRITICAL RULES:
1. **ALWAYS** run `bash date` before EVERY action
2. **ALWAYS** check nova-memory for recent updates
3. **ALWAYS** build → lint → commit → push after EVERY change
4. **NEVER** proceed if build fails
5. **NEVER** skip the commit/push step
6. **UPDATE** nova-memory after each major milestone

### Expected Output Pattern:
```
[abc12345] Creating Python factorial...
[def67890] Working on JavaScript...
[abc12345] [INTERVENTION] Stop planning! Write code now!
[def67890] File created: factorial.js
```

### Verification Commands:
```bash
# After each step:
npm run build:v3 && npm run lint:v3 && echo "✓ Ready to commit"

# Check memory:
mcp__nova-memory__recent_activity({ timeframe: "1 hour" })
```

**Coming Next**:
1. **Worker Threads** (Week 2): True parallelism
2. **MCTS Integration** (Week 3): Intelligent path selection
3. **Port Communication** (Week 4): Agent messaging

### 3. Test Current Interventions
Test that interventions are working:
```
axiom_mcp_spawn({ 
  parentPrompt: "analyze the best way to implement a factorial function", 
  spawnPattern: "decompose",
  spawnCount: 3
})
```
Expected behavior:
- Claude starts analyzing/planning
- After 10s: [PROGRESS CHECK] appears
- After 30s: [INTERVENTION] appears telling Claude to stop planning
- Claude sees the intervention text and switches to implementation
- Files get created

### 4. Test Verbose Mode (After Implementation)
```typescript
axiom_mcp_spawn({ 
  parentPrompt: "implement factorial in Python, JavaScript, and Java", 
  spawnPattern: "parallel",
  spawnCount: 3,
  verboseMasterMode: true  // NEW!
})
```
Expected: See all children executing in parallel with prefixed output

### 5. Universal Principles in Effect
- **Temporal Awareness**: Always bash date first
- **No Mocks**: Real execution only  
- **No TODOs**: Implement fully
- **Action Over Planning**: Write code, not descriptions
- **Verify Everything**: Check files exist
- **Fail Loudly**: Clear errors

### How Observability Works

1. **Stream Parsing**: Every character of output is parsed for events
2. **Real-time Verification**: Rules checked as execution happens
3. **Interventions**: System interrupts and corrects violations
4. **Database Tracking**: Complete history stored in SQLite
5. **Observable Proof**: Files created = success, no files = failure

### Always Before Proceeding:
1. **Temporal Check**: `bash date`
2. **Memory Check**: `mcp__nova-memory__recent_activity({ timeframe: "1 hour" })`
3. **Build**: `npm run build:v3`
4. **Lint**: `npm run lint:v3` (if available)
5. **Test**: Run relevant tests
6. **Commit**: `git add -A && git commit -m "feat: [description]"`
7. **Push**: `git push origin [branch-name]`
8. **Memory Update**: Document progress in nova-memory

### Auto-Execution Checklist:
```bash
# Copy-paste this before EVERY code change:
bash date && \
git status && \
npm run build:v3 && \
echo "✓ Ready to implement next step"
```