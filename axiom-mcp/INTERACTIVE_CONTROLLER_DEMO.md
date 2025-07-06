# Interactive Controller Demo

## Overview

The Interactive Controller addresses the user's insight about observability and long-running tasks. Instead of using `claude -p` with a single prompt and waiting for completion, it:

1. **Launches Claude in interactive mode** (no -p flag)
2. **Monitors output in real-time** as Claude responds
3. **Analyzes responses** to detect completion patterns
4. **Sends follow-up prompts** based on verification state
5. **Continues interaction** until implementation is complete

## Key Features

### Real-Time Monitoring
```typescript
// Monitor stdout in real-time
proc.stdout?.on('data', (data) => {
  const chunk = data.toString();
  // Process output as it streams in
  
  // Check if Claude seems done with current response
  if (this.isResponseComplete(buffer + chunk)) {
    this.analyzeAndRespond(sessionId, session, taskId);
  }
});
```

### Smart Response Analysis
The controller detects patterns that indicate:
- Claude is waiting for input
- Claude is theorizing instead of implementing
- Claude has completed its response
- Claude needs specific guidance

### Automated Follow-Up Prompts
Based on system verification, it sends targeted prompts:

```typescript
if (!proof.hasImplementation && hasNoImplementationPatterns) {
  // Claude is theorizing instead of implementing
  session.send(
    `STOP. You're describing what to do instead of doing it.\n` +
    `Use the Write tool RIGHT NOW to create the files.\n` +
    `Don't explain, just write: Write('filename.py', '''actual code here''')`
  );
}
```

## Usage in axiom-mcp-implement

Enable interactive mode with the `useInteractive` flag:

```typescript
await mcp__axiom_mcp__axiom_mcp_implement({
  task: "Create a complex feature with tests",
  useInteractive: true,  // Enable interactive mode
  maxRetries: 3
});
```

## Benefits

1. **Handles Long Tasks**: Can run for 5-20 minutes with continuous monitoring
2. **Forces Implementation**: Keeps prompting until code is actually written
3. **Observable Progress**: See what's happening in real-time
4. **Adaptive Control**: Adjusts prompts based on Claude's behavior
5. **System Verification**: Can't be fooled by claims of completion

## Example Interaction Flow

1. **Initial Prompt**: "Create a calculator with tests"
2. **Claude Response**: "I would create a Calculator class..."
3. **System Verification**: No files created ❌
4. **Follow-up Prompt**: "STOP. Use Write tool to create calculator.py NOW."
5. **Claude Response**: [Actually uses Write tool]
6. **System Verification**: File created ✓
7. **Follow-up Prompt**: "Good. Now run pytest with Bash tool."
8. **Claude Response**: [Runs tests]
9. **System Verification**: Tests pass ✓
10. **Session Complete**: Implementation successful!

## Testing

Run the test script to see it in action:
```bash
node test-interactive-controller.js
```

This will demonstrate:
- Real-time output monitoring
- Verification events
- Automated follow-up prompts
- Completion detection