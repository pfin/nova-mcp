# Axiom MCP Tool - Working Notes

## What Axiom MCP Is

Axiom MCP is a **research and planning tool** that uses Claude to decompose complex goals into subtasks. It appears to be designed for:
- Breaking down vague requirements into specific tasks
- Providing analysis frameworks
- Asking clarifying questions
- Creating theoretical approaches

## Key Functions

### 1. `axiom_mcp_goal` ✅ Works Well
- Takes a goal and provides excellent analysis
- Asks smart clarifying questions
- Defines success criteria
- Creates structured approach
- **BUT**: Only provides analysis, no implementation

### 2. `axiom_mcp_chain` ⚠️ Limited Value
- Supposed to do "chain of goal-oriented research"
- Only produces theoretical frameworks
- No actual implementation
- Context tracking works but serves no practical purpose

### 3. `axiom_mcp_explore` ❌ Broken
- Attempts to spawn parallel research branches
- Consistently times out after ~5 minutes
- No partial results on failure
- Error messages unhelpful

### 4. `axiom_mcp_spawn` ❌ Broken
- Similar to explore but with different patterns
- Fails to parse subtasks
- No clear error messages
- Cannot successfully execute

### 5. `axiom_mcp_status` ✅ Works
- Shows system status
- Lists tasks and their states
- Clean output format

### 6. `axiom_mcp_tree` ✅ Works
- Visualizes task hierarchies
- Multiple output formats
- Good for understanding structure

## Critical Limitations

### 1. No Code Generation
- **Never writes actual code**
- Only discusses what code should do
- No file creation or editing
- No implementation of any kind

### 2. No Execution
- Doesn't run tests
- Doesn't verify implementations
- Doesn't compile or build
- Pure planning with no action

### 3. Subprocess Issues
- All parallel execution fails
- Timeouts around 5 minutes
- No streaming output
- No error diagnostics

## Example Usage Pattern

```typescript
// What users expect:
axiom_mcp_goal("Create unit tests for Dual class")
// Result: Working test file created and verified

// What actually happens:
axiom_mcp_goal("Create unit tests for Dual class")
// Result: Essay about testing best practices
```

## Lessons Learned

1. **Axiom MCP is a research tool, not a development tool**
   - Good for understanding problems
   - Useless for solving them

2. **The "goal" in "goal-oriented" means understanding, not achieving**
   - It will research your goal
   - It won't accomplish your goal

3. **Parallel execution is completely broken**
   - Every subprocess attempt fails
   - No useful error information
   - Timeouts make it unusable

4. **Best use case: Initial planning only**
   - Use it to understand a problem
   - Then implement the solution yourself
   - Don't expect any actual work done

## Recommendations for Users

### DO Use Axiom MCP For:
- Breaking down complex requirements
- Understanding project scope
- Getting clarifying questions
- Initial planning phases

### DON'T Use Axiom MCP For:
- Writing code
- Creating tests
- Building features
- Any task requiring actual output
- Time-sensitive work

## Additional Findings (Second Attempt)

### Connection Issues
- The MCP server connection is unstable
- After some usage, returns "Not connected" errors
- No clear way to reconnect or diagnose connection issues

### New Functions Tested

#### `axiom_mcp_implement` ❌ Failed
- Supposed to be the "implementation" function
- Still doesn't write any code
- Returns immediately with "Implementation Failed"
- Error message admits: "Not writing actual code files"

#### `axiom_mcp_spawn_streaming` ❌ Error
- Throws "Cannot read properties of null (reading 'status')"
- Indicates internal implementation issues
- No useful error diagnostics

#### `axiom_mcp_spawn_mcts` ❌ Connection Lost
- Lost connection before could test
- Monte Carlo Tree Search sounds promising
- Can't evaluate due to infrastructure issues

### Pattern Confirmed
Even the function explicitly named `axiom_mcp_implement` that claims to "Execute an implementation task that actually writes and verifies code" **does not write any code**. The error message literally says:
- "Not writing actual code files"
- "Not running tests to verify implementation"
- "Providing descriptions instead of implementations"

This confirms the fundamental issue: **Axiom MCP is incapable of implementation**, even when using functions specifically designed for that purpose.

## Bottom Line

Axiom MCP would be better named "Axiom Research Assistant" - it's good at thinking about problems but incapable of solving them. For actual software development tasks, you'll need to:
1. Use Axiom MCP to understand the task
2. Manually implement everything yourself
3. Not rely on it for any actual work

The tool has potential but needs fundamental redesign to be useful for software engineering. Additionally, it has stability issues with connections dropping during use.