# CLAUDE.md - Axiom MCP v3 Development Guide

## Critical Context

This is the Axiom MCP v3 project - a parallel execution observatory that enforces real implementation through observation and intervention.

**Latest Status (July 7, 2025)**: 
- ✅ Observability infrastructure complete (database, parser, verifier)
- ✅ Universal principles system with temporal awareness
- ✅ Real-time intervention CONNECTED! (as of July 6, 18:43)
- ✅ SDK Streaming IMPLEMENTED! (as of July 6, 20:10)
- 🚧 **CURRENT FOCUS**: Verbose Master Mode implementation (Days 1-5)
- 📊 **System Completion**: 35% → Target 70% after Verbose Mode

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

## Critical Discovery (July 6, 2025)

**The observer exists but doesn't intervene during execution!** 

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

1. **Always use temporal awareness**:
   ```bash
   bash date  # Know when you are!
   ```

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

## Remember

The entire point of Axiom MCP is to force real implementation. If it doesn't create files, it's not working. The observability system shows us exactly what's happening - use it!

## Next Steps (Priority Order)

### 1. ✅ Connect Real-Time Intervention (COMPLETED July 6, 18:43)
**Status**: Intervention system connected and working!
- 30-second planning timeout ✓
- TODO detection ✓  
- 10-second progress checks ✓
- Interventions written via `executor.write()` ✓

### 2. 🚧 ACTIVE: Verbose Master Mode Implementation

**Status**: Day 1 of 5 (Monday, July 7, 2025)

## CRITICAL AUTO-EXECUTION PROTOCOL

For tomorrow's implementation, follow this EXACT sequence:

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