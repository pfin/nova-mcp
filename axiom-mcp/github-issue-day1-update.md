# GitHub Issue #1: Day 1 Implementation Plan

## Verbose Master Mode - Day 1 (Monday, July 7, 2025)

### 🎯 Day 1 Goal
Implement the core StreamAggregator component and integrate it with axiom-mcp-spawn to enable real-time streaming of child task output with prefixed identifiers.

### 📋 Pre-work Checklist
- [ ] Run `bash date` to confirm temporal context
- [ ] Review `docs/AXIOM_V3_STREAM_AGGREGATION_BLUEPRINT.md`
- [ ] Check build status: `npm run build:v3`
- [ ] Verify MCP inspector: `npx @modelcontextprotocol/inspector dist-v3/index.js`
- [ ] Create Day 1 branch: `git checkout -b verbose-mode-day-1`

### 🌅 Morning Session (9:00 AM - 1:00 PM EDT)

#### 9:00-9:30 AM: Schema Update
- Update `src-v3/tools/axiom-mcp-spawn.ts` schema
- Add `verboseMasterMode` boolean flag
- Add `streamingOptions` configuration object
- Build and verify no TypeScript errors

#### 9:30-11:30 AM: Create StreamAggregator
- Create `src-v3/aggregators/` directory
- Implement `StreamAggregator` class with:
  - PTY executor attachment
  - SDK executor attachment
  - Line buffering for clean output
  - Intervention detection
  - Progress tracking
  - Color-coded prefixes

#### 11:30 AM-1:00 PM: Unit Tests
- Create comprehensive test suite
- Test prefix formatting
- Test line buffering
- Test multiple stream handling
- Test intervention detection
- Run tests: `npm run test:v3 -- stream-aggregator`

### 🌆 Afternoon Session (2:00 PM - 6:00 PM EDT)

#### 2:00-2:30 PM: Integration Prep
- Commit morning work
- Add imports to axiom-mcp-spawn
- Install dependencies: `chalk`, `cli-progress`

#### 2:30-5:30 PM: Core Integration
- Add verbose mode check in `handleAxiomMcpSpawn`
- Create progress tracking with multi-bar
- Modify child execution to be non-blocking
- Attach executors to aggregator BEFORE execution
- Implement immediate return logic
- Add completion tracking

#### 5:30-6:00 PM: Testing & Validation
- Build: `npm run build:v3`
- Test with MCP inspector
- Simple test case:
  ```typescript
  axiom_mcp_spawn({
    parentPrompt: "Create hello world in Python and JavaScript",
    spawnPattern: "parallel",
    spawnCount: 2,
    verboseMasterMode: true
  })
  ```
- Verify streaming output appears
- Commit and push Day 1 work

### 📊 Success Criteria
- [ ] Schema updated with verbose mode flags
- [ ] StreamAggregator class implemented
- [ ] Unit tests passing
- [ ] Integration with axiom-mcp-spawn complete
- [ ] Child output streams with prefixes visible
- [ ] Progress bars working
- [ ] Non-blocking execution verified
- [ ] All code committed to `verbose-mode-day-1` branch

### 🚀 Expected Output
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    VERBOSE MASTER MODE - PARALLEL EXECUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Parent: Create hello world in Python and JavaScript
Pattern: parallel | Children: 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[abc12345] Starting execution...
[def67890] Starting execution...
[abc12345] Creating hello_world.py...
[def67890] I'll create a JavaScript hello world...
[abc12345] def main():
[abc12345]     print("Hello, World!")
[def67890] console.log("Hello, World!");
[abc12345] File created: hello_world.py
[def67890] File created: hello.js

[MASTER] Progress: 2/2 tasks completed
[MASTER] All tasks completed in 4.2s
```

### 🔧 Technical Details

**Key Files to Create/Modify:**
1. `src-v3/aggregators/stream-aggregator.ts` (NEW)
2. `src-v3/aggregators/__tests__/stream-aggregator.test.ts` (NEW)
3. `src-v3/tools/axiom-mcp-spawn.ts` (MODIFY)

**Dependencies to Add:**
- `chalk` - For colored terminal output
- `cli-progress` - For progress bars

**Integration Points:**
- Hook into existing PTY/SDK executor events
- Maintain compatibility with ConversationDB
- Preserve intervention system functionality
- Keep existing blocking mode as fallback

### 💡 Implementation Notes

1. **Line Buffering**: Critical for clean output - accumulate partial lines until newline
2. **Color Assignment**: Assign colors to tasks in order for easy visual distinction
3. **Progress Estimation**: Use line count as rough progress indicator
4. **Error Handling**: Ensure graceful degradation if streaming fails
5. **Performance**: Use Node.js streams for efficient memory usage

### 🐛 Potential Issues

1. **ANSI Colors in Non-TTY**: Check `process.stderr.isTTY` before applying colors
2. **Back-pressure**: Implement proper stream back-pressure handling
3. **Memory Leaks**: Ensure event listeners are cleaned up on exit
4. **Race Conditions**: Attach aggregator before starting execution

### 📝 End of Day Deliverables

1. Working StreamAggregator implementation
2. Updated axiom-mcp-spawn with verbose mode
3. All tests passing
4. Clean commit history on feature branch
5. Updated documentation reflecting changes

---

*Day 1 of 5 - Verbose Master Mode Implementation*  
*Target: Transform silent execution into observable parallel streams*