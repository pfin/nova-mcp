# Axiom Hook Diagnostic Report

## Issues Identified

### 1. Task Execution Stuck
- **Task ID**: task-1752267889998
- **Runtime**: Over 55 minutes (3343+ seconds)
- **Expected**: Should have received intervention at 8 minutes (480 seconds)
- **Status**: Still showing as "RUNNING"

### 2. RESEARCH-AXIOM Hook Not Working
- **Expected behavior**:
  - Priority 105 should intercept before validation
  - Warning at 6 minutes (75% of 8 minutes)
  - Force implementation at 8 minutes
- **Actual behavior**:
  - No warning message appeared
  - No forced implementation
  - Task continues indefinitely

### 3. Hook Databases Not Created
- **Expected files**:
  - `logs/axiom-patterns.json` (META-AXIOM)
  - `logs/research-insights.json` (RESEARCH-AXIOM)
- **Actual**: Neither file exists

### 4. Empty Log Files
- Log files are created but remain empty
- No event tracking occurring

## Root Causes

### 1. PTY Executor Issue
The fundamental issue is that the PTY executor is not properly sending prompts to Claude. Tasks get stuck at the prompt input stage and never actually execute.

Evidence:
- Output shows Claude UI elements but no actual execution
- The prompt is typed character by character but never submitted
- Despite using `\x0d` (Ctrl+Enter), submission isn't working

### 2. Hook Context Not Propagating
Even if the RESEARCH-AXIOM hook has priority 105, it may not be receiving the proper context to track execution streams.

### 3. Missing Request Args
The `researchTimeLimit` parameter may not be properly passed through the hook chain.

## Why Nested Spawning Can't Work

For nested axiom spawning to work, we need:

1. **Working PTY execution** - The parent task must actually run
2. **Access to axiom_spawn from within Claude** - The executing Claude instance needs to be able to call back to axiom
3. **Hook monitoring** - Hooks need to track the execution stream
4. **Communication channel** - Sub-tasks need a way to report back

Currently, none of these are functioning properly.

## Recommendations

### Immediate Fixes Needed

1. **Fix PTY Submission**
   ```typescript
   // Current (not working):
   pty.write('\x0d'); // Ctrl+Enter
   
   // Alternatives to try:
   pty.write('\r\n'); // Carriage return + newline
   pty.write('\n');   // Just newline
   pty.write('\r');   // Just carriage return
   ```

2. **Add Debug Logging**
   ```typescript
   // In PTY executor
   console.error('[PTY-DEBUG] Sending prompt:', prompt);
   console.error('[PTY-DEBUG] Submission sequence:', '\\x0d');
   ```

3. **Verify Hook Registration**
   ```typescript
   // In index.ts after registration
   console.error('[HOOK-DEBUG] Registered:', researchAxiomHook.name, 'priority:', researchAxiomHook.priority);
   ```

### Alternative Approach

Instead of trying to make Claude spawn sub-tasks directly, consider:

1. **Pre-decomposition**: Break tasks into sub-tasks before sending to Claude
2. **Sequential execution**: Run tasks one after another instead of nested
3. **External orchestration**: Use the orchestrator to manage task relationships

## Test Plan

1. Create a minimal test that just submits a prompt and waits for output
2. Verify hooks are receiving events with debug logging
3. Test simple task execution before complex nesting
4. Check if Claude can even see/access axiom_spawn from within execution

## Conclusion

The current implementation has fundamental issues with:
- PTY command submission
- Hook event propagation  
- Execution monitoring
- Nested task spawning

These need to be fixed before the advanced features (research time-boxing, pattern learning, nested spawning) can work properly.