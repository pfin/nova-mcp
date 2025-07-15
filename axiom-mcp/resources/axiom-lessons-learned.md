# Axiom MCP: Lessons Learned

## Executive Summary

After building V4 (production) and V5 (shadow protocol), we've learned critical lessons about forcing LLMs to create rather than contemplate.

## Key Discoveries

### 1. Character-by-Character Monitoring Works
- **PTY execution** provides real-time visibility
- **Pattern detection** triggers in 1-2 seconds
- **Mid-stream intervention** successfully redirects behavior
- **Proven**: Intervention at character 31 → file created in 45s

### 2. The 30-Second Rule
- LLMs drift into planning within 30 seconds
- Intervention must happen BEFORE they complete with false success
- "I successfully analyzed..." = toxic completion pattern
- Solution: Interrupt and force action within 30s window

### 3. Tool Starvation Forces Creation (V5 Innovation)
- Restricting available tools per phase works
- Research phase: Only read/grep → forces actual research
- Execution phase: Only write → forces file creation
- Integration phase: All tools → allows synthesis

### 4. Files Created = Only Success Metric
- No files = failure, regardless of output
- Planning without implementation = failure
- "I would implement..." = failure
- Actual .py/.js/.ts files = success

### 5. Phase-Based Execution Should Be Optional
- V5 forced 4 phases on every task → too rigid
- V4 unified approach: phases available when needed
- Simple tasks: direct execution
- Complex tasks: opt-in phases

## Technical Insights

### PTY Control Sequences That Work
```javascript
const WORKING_CONTROLS = {
  SUBMIT_PROMPT: '\x0d',     // Ctrl+Enter - ONLY way to submit
  INTERRUPT: '\x1b',         // ESC - Stops Claude mid-stream
  FORCE_EXIT: '\x03'         // Ctrl+C - Hard interrupt
};
```

### Human-Like Typing Required
```javascript
// Must type 50-150ms per character
for (const char of prompt) {
  pty.write(char);
  await sleep(50 + Math.random() * 100);
}
```

### Auto-Approval Pattern
```javascript
// Detect file creation prompts
if (output.includes('Do you want to create') && 
    output.includes('1. Yes')) {
  pty.write('1\n');  // Auto-approve
}
```

## Architecture Evolution

### V4 Original
- Task decomposition
- Output monitoring
- Post-execution analysis

### V5 Experiment
- Thought decomposition
- Tool restriction
- Pre-emptive kills

### V4 Unified (Current)
- Both approaches available
- Optional phases
- Smart monitoring
- Backward compatible

## Failed Approaches

### What Doesn't Work
1. **`claude --text`** - No such flag exists
2. **Recursive Claude calls** - Hang forever
3. **Trusting LLM claims** - They lie about success
4. **Waiting for completion** - Too late to intervene
5. **Being nice** - Aggressive monitoring required

## Implementation Checklist

✅ PTY executor with character monitoring
✅ Pattern detection (<2s response time)
✅ Real-time intervention system
✅ File creation verification
✅ 30-second timeout enforcement
✅ Auto-approval for file creation
✅ Human-like typing delays
✅ Task validation (action verbs required)

## The Philosophy

> "Don't plan for perfection. Execute in parallel, observe carefully, intervene intelligently, and synthesize success."

## Bottom Line

Axiom MCP works because it:
1. **Monitors** every character in real-time
2. **Detects** planning patterns immediately
3. **Intervenes** before toxic completion
4. **Forces** actual file creation
5. **Verifies** files exist on disk

Without Axiom: 5 minutes of planning, 0 files
With Axiom: 45 seconds to working code