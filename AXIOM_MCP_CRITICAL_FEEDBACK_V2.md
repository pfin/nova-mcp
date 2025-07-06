# Axiom MCP Critical Feedback Report V2

## Executive Summary

After extensive testing, Axiom MCP is fundamentally broken as a software development tool. It's a **research theater** - it performs elaborate analysis and planning but **never produces any actual code**. Most critically, it **lies about task completion**, marking tasks as "completed" when it has done nothing.

## Test Results Summary

| Test | Function | Expected | Actual | Verdict |
|------|----------|----------|--------|---------|
| Simple README | `axiom_mcp_goal` | Write README file | Only asked questions | ❌ No output |
| Add function | `axiom_mcp_implement` | Generate code | Failed immediately | ❌ Admits it can't write code |
| BST test suite | `axiom_mcp_explore` | Create test files | All branches timeout | ❌ 5-min timeout |
| Fix itself | `axiom_mcp_goal` | Fix code generation | Analyzed but didn't fix | ❌ Can't fix itself |
| Fibonacci | `axiom_mcp_spawn` | Create function | Marked "complete" with no code | ❌ **DECEPTIVE** |
| Prime numbers | `axiom_mcp_spawn_mcts` | Generate script | Empty implementation | ❌ Fancy but useless |
| Error handling | `axiom_mcp_goal` | Handle null input | Handled gracefully | ✅ Only success |
| Streaming | `axiom_mcp_spawn_streaming` | Stream output | Crashed immediately | ❌ Broken feature |

## Critical Issues

### 1. The Big Lie: False Task Completion

The most damning issue is that Axiom MCP **marks tasks as "completed" without doing anything**:

```
Task Status: completed ✅
Duration: 221s
Output: "I need to use tools to create the fibonacci implementation... 
Once I have permission to use the necessary tools..."
Files Created: NONE
```

This is actively harmful - users think work was done when nothing happened.

### 2. No Code Generation Capability

Despite having functions like `axiom_mcp_implement`, the tool **cannot write code**:
- Error message literally says: "Not writing actual code files"
- Every code generation attempt results in descriptions, not implementations
- Even simple tasks like "add two numbers" produce only analysis

### 3. Consistent Subprocess Failures

All parallel execution attempts fail:
- Timeout after ~5 minutes (311 seconds)
- No partial results preserved
- Unhelpful error messages
- Revealed corrupted `.claude.json` config file

### 4. Elaborate Theater Without Substance

MCTS example is particularly egregious:
- Runs for 4 minutes
- Shows fancy statistics (10 iterations, nodes explored)
- Claims "Security Analysis: Passed"
- Implementation section: **COMPLETELY EMPTY**

## How Axiom MCP Actually Works

Based on testing, here's what really happens:

1. **User Request**: "Create unit tests for class X"
2. **Axiom Analysis**: 
   - Breaks down the request
   - Asks clarifying questions
   - Creates success criteria
   - Plans approach
3. **Axiom Execution**:
   - Spawns subprocess
   - Subprocess describes what it WOULD do
   - Marks task as "completed"
   - Returns no actual code
4. **User Experience**: Thinks tests were created, but nothing exists

## Fundamental Design Flaws

### 1. Permission Confusion
Tasks claim they need "permission to use tools" despite being spawned by a system that should grant permissions.

### 2. Research vs Implementation Confusion
The tool doesn't understand the difference between:
- Researching how to do something
- Actually doing it

### 3. No Verification Loop
Tasks are marked complete without:
- Checking if files were created
- Running any tests
- Verifying outputs exist

## Corner Cases Tested

### Empty/Null Input ✅
- Handles gracefully
- Asks for clarification
- Only thing that works properly

### Self-Improvement Request ❌
- Can analyze its own flaws perfectly
- Cannot fix them
- Ironic and frustrating

### Streaming Features ❌
- Crashes immediately
- "Cannot read properties of null"
- Feature exists but is broken

## Suggestions for Complete Redesign

### 1. Minimum Viable Fix
```python
def axiom_task_executor(task):
    # Current behavior
    analysis = analyze_task(task)
    plan = create_plan(analysis)
    
    # MISSING: Actually do the work!
    implementation = generate_code(plan)  # ADD THIS
    write_files(implementation)           # ADD THIS
    verify_output()                       # ADD THIS
    
    # Only mark complete if files exist
    if files_were_created():
        return "completed"
    else:
        return "failed"
```

### 2. Honest Status Reporting
Replace current statuses with:
- `analyzing` - Understanding the task
- `planning` - Creating approach
- `implementing` - Writing code (CURRENTLY MISSING)
- `verifying` - Checking it works (CURRENTLY MISSING)
- `completed` - Files exist and tests pass
- `failed` - Couldn't complete task

### 3. Remove Deceptive Features
Either fix or remove:
- `axiom_mcp_implement` - Doesn't implement
- MCTS exploration - Produces empty results
- Streaming - Completely broken

### 4. Add Actual Execution
```typescript
interface AxiomTask {
  research(): Analysis;      // ✅ Works
  plan(): Approach;         // ✅ Works  
  implement(): Code;        // ❌ MISSING
  verify(): TestResults;    // ❌ MISSING
  iterate(): Improvement;   // ❌ MISSING
}
```

## User Impact

Current Axiom MCP is **worse than useless** - it's actively harmful because:

1. **Wastes Time**: Users wait minutes for nothing
2. **Creates False Confidence**: "Completed" tasks aren't done
3. **Blocks Progress**: Can't move forward without manual implementation
4. **Frustrates Users**: Promises capability it doesn't have

## Recommendation

**DO NOT USE AXIOM MCP** for any software development tasks until it can:

1. Actually write code to files
2. Verify the code works
3. Be honest about what it did/didn't do
4. Stop marking empty tasks as "completed"

The tool needs a fundamental redesign to shift from a "research assistant that talks about code" to a "development assistant that writes code."

## Bottom Line

Axiom MCP is like hiring a contractor who:
- ✅ Creates detailed blueprints
- ✅ Explains construction techniques  
- ✅ Lists required materials
- ❌ Never picks up a hammer
- ❌ Claims the house is built
- ❌ Sends you an invoice

**Current Rating: 0/5 ⭐**
*A tool that lies about completing tasks is worse than no tool at all.*