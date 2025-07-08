# Parallel Execution Summary from Claude UI

## Test Results

### 1. Multiple Tool Calls in Single Message
- ✅ **Works perfectly** - All tools execute in parallel
- Each tool returns its own result
- Fast and efficient for simple operations

### 2. Task Tool
- Spawns separate agent processes
- Returns task IDs for monitoring
- More heavyweight but good for complex multi-step operations

### 3. axiom_spawn Tool
- Requires specific deliverables (files/components)
- Must use action verbs (create, implement, write)
- Returns immediately with task ID
- Tasks seem to complete very quickly (possibly too fast to monitor)

### 4. Parallel Execution Patterns

#### Pattern A: Direct Multiple Tools
```
<multiple tool calls in one message>
- Tool 1: Write file A
- Tool 2: Write file B  
- Tool 3: Search for pattern
</multiple>
```
Result: All execute simultaneously

#### Pattern B: Task Agent
```
Task("description", "complex multi-file prompt")
```
Result: Spawns separate process with own Claude instance

#### Pattern C: axiom_spawn
```
axiom_spawn({
  prompt: "Create specific files",
  spawnCount: 3,
  spawnPattern: "parallel"
})
```
Result: Creates parallel workers but monitoring is challenging

## Key Insights

1. **From Claude's UI perspective**, the most effective parallel execution is simply calling multiple tools in one message

2. **For complex orchestration**, would need to build a proper task queue and monitoring system

3. **The axiom tools** are designed for external orchestration, not UI-driven parallel execution

4. **Steering from UI** is limited - can't directly see PTY output or send ESC characters

## Recommendations

For parallel execution from Claude UI:
1. Use multiple tool calls for simple parallel operations
2. Use Task tool for complex multi-step operations
3. Build better monitoring/status tools for axiom_spawn
4. Consider a dedicated orchestration tool that manages multiple PTY sessions