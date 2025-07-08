# Axiom MCP v4 - Real User Experience Report

## Executive Summary

As a user testing Axiom MCP v4, I encountered both brilliant design decisions and frustrating blockers. The tool successfully enforces concrete action over planning, but the Claude trust prompt creates a significant barrier to adoption.

## Test Results

### ✅ What Worked Well

1. **Clear Tool Descriptions**
   - Each tool has helpful descriptions
   - The axiom://tools-guide resource is comprehensive
   - Examples show real usage patterns

2. **Async Task Model**
   - Returns taskId immediately - no blocking
   - Can monitor multiple tasks
   - Clean status checking

3. **Validation Hook**
   - Successfully prevents "analysis paralysis"
   - Forces concrete deliverables
   - Clear error messages about what's needed

4. **Tool Discovery**
   - MCP integration works smoothly
   - Resources are discoverable
   - Good documentation structure

### ❌ What Failed

1. **Claude Trust Prompt (CRITICAL)**
   - Every axiom_spawn gets stuck at trust prompt
   - No automated way to handle this
   - Blocks all execution

2. **Error Messages**
   - "Task undefined is not running" is confusing
   - Should show parameter requirements

3. **Task Management**
   - No way to clean up stuck tasks
   - Status display gets cluttered
   - No task history

## User Journey

### Attempt 1: Simple Test
```
Goal: Test basic functionality
Action: axiom_spawn({ "prompt": "echo hello" })
Result: FAILED - Validation rejected non-concrete action
Learning: Need action verbs like create, implement, write
```

### Attempt 2: Create Python File  
```
Goal: Create a calculator file
Action: axiom_spawn({ 
  "prompt": "create demo-calculator.py with Calculator class",
  "verboseMasterMode": true
})
Result: BLOCKED - Stuck at Claude trust prompt
Learning: Critical blocker for all file operations
```

### Attempt 3: Check Status
```
Goal: Monitor running tasks
Action: axiom_status({})
Result: SUCCESS - Shows all tasks but hard to read
Learning: Needs better formatting for multiple tasks
```

### Attempt 4: Interrupt Stuck Tasks
```
Goal: Clean up blocked tasks
Action: axiom_interrupt({ 
  "taskId": "task-123", 
  "followUp": "exit" 
})
Result: SUCCESS - Tasks interrupted properly
Learning: Good recovery mechanism
```

## Pain Points & Solutions

### 1. Trust Prompt Issue
**Current:** Every task blocks on trust
**Solution:** 
```bash
# Add to spawn options
axiom_spawn({
  "prompt": "create file.py",
  "trustMode": "auto-accept",  // New option
  "trustPaths": ["/home/user/projects"]  // Pre-trusted paths
})
```

### 2. Parameter Validation
**Current:** Unclear error on missing params
**Solution:**
```typescript
// Better error handling
if (!params.taskId) {
  return {
    error: "Missing required parameter",
    usage: "axiom_send({ taskId: string, message: string })",
    example: "axiom_send({ taskId: 'task-123', message: 'yes\\n' })"
  };
}
```

### 3. Status Display
**Current:** Text blob for multiple tasks
**Solution:** Structured output with filtering
```typescript
axiom_status({
  "format": "table",  // or "json", "compact"
  "filter": "running",  // or "completed", "failed"
  "sortBy": "runtime"  // or "startTime", "taskId"
})
```

## Recommendations

### Immediate Fixes (This Week)
1. **Handle trust prompt automatically**
   - Add environment variable check
   - Or provide bypass option
   - Document workaround clearly

2. **Improve error messages**
   - Show parameter schemas
   - Include examples in errors
   - Add "did you mean?" suggestions

3. **Add task cleanup command**
   ```typescript
   axiom_cleanup({
     "filter": "stuck",  // or "all", "completed"
     "olderThan": "5m"  // or "1h", "1d"
   })
   ```

### Future Enhancements
1. **Task Templates**
   - Common patterns pre-configured
   - Language-specific templates
   - Project scaffolding

2. **Progress Tracking**
   - Percentage complete for long tasks
   - ETA estimates
   - Step-by-step status

3. **Integration Features**
   - Webhook notifications
   - CI/CD integration
   - IDE plugins

## Overall Assessment

**Strengths:**
- ✅ Enforces action-oriented development
- ✅ Parallel execution capability
- ✅ Good async patterns
- ✅ Comprehensive documentation

**Weaknesses:**
- ❌ Trust prompt blocks everything
- ❌ Error messages need work
- ❌ Task management could be better
- ❌ Status display needs formatting

**Score: 7/10**

**Recommendation:** Fix the trust prompt issue and this becomes a 9/10 tool. The core concept is solid, but the execution blocker severely impacts usability.

## One User's Perspective

"I love the idea - forcing concrete actions is exactly what I need. But spending 10 minutes trying to get past a trust prompt killed my enthusiasm. Fix that one issue and you have a winner."

---

*Generated after 30 minutes of hands-on testing with Axiom MCP v4*