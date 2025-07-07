# Streaming Best Practices for Axiom MCP v3

## Summary

Axiom MCP v3 now properly implements streaming using the Claude Code SDK (`@anthropic-ai/claude-code`). This ensures real-time message streaming and proper handling of Claude's responses.

## Implementation Details

### 1. Two Execution Modes

The system now intelligently chooses between two executors:

- **SDK Executor**: For non-interactive tasks (default)
  - Uses `@anthropic-ai/claude-code` SDK
  - Provides structured streaming messages
  - Better performance and reliability
  - Proper handling of tool calls

- **PTY Executor**: For interactive tasks only
  - Used when tasks need user interaction
  - Examples: npm install, sudo commands, login prompts
  - Maintains terminal session state

### 2. Automatic Executor Selection

The system detects interactive patterns:
```typescript
function needsInteractiveExecution(prompt: string): boolean {
  const interactivePatterns = [
    /\b(install|npm install|yarn|pip install|apt-get|brew)\b/i,
    /\b(permission|sudo|admin|authorize)\b/i,
    /\b(login|authenticate|credentials)\b/i,
    /\b(interactive|dialog|prompt for)\b/i,
    /\b(server|start server|run server|localhost)\b/i,
  ];
  return interactivePatterns.some(pattern => pattern.test(prompt));
}
```

### 3. SDK Streaming Pattern

The SDK executor follows the Claude Code SDK streaming pattern:
```typescript
for await (const message of query({ prompt, options })) {
  // Process each message as it arrives
  // Emit events for observability
  // Store in database for tracking
}
```

### 4. Benefits of SDK Streaming

- **Real-time feedback**: Messages stream as they're generated
- **Structured data**: SDK provides typed message objects
- **Better error handling**: SDK errors are properly typed
- **Tool call support**: Native handling of Claude's tool usage
- **Performance**: No overhead from PTY terminal emulation

### 5. Event Flow

1. User calls `axiom_mcp_spawn` with a task
2. System checks if task needs interactive execution
3. SDK executor (default) or PTY executor is chosen
4. Messages stream in real-time to:
   - Console output (via stderr)
   - Database storage (conversations, actions, streams)
   - Stream parser for event extraction
   - Rule verifier for intervention triggers

### 6. Database Integration

All streaming events are captured:
- **Conversations**: Parent/child task hierarchy
- **Actions**: Significant events (file creation, errors, etc.)
- **Streams**: Raw message chunks for full audit trail

### 7. Best Practices

1. **Prefer SDK executor**: It's faster and more reliable
2. **Use PTY only when needed**: Interactive prompts require it
3. **Monitor streaming events**: Use `axiom_mcp_observe` to watch execution
4. **Check intervention logs**: System intervenes when no progress detected
5. **Verify file creation**: Success = files created, not just planning

## Testing the Implementation

Test non-interactive streaming:
```bash
axiom_mcp_spawn({
  parentPrompt: "Create a factorial function in Python",
  spawnPattern: "decompose",
  spawnCount: 3
})
```

Test interactive execution:
```bash
axiom_mcp_spawn({
  parentPrompt: "Install and configure a new npm package",
  spawnPattern: "sequential",
  spawnCount: 2
})
```

## Future Enhancements

1. **Verbose Master Mode**: Stream all child task output in real-time
2. **WebSocket streaming**: Real-time browser monitoring
3. **Multi-model integration**: Use multiple AI models in parallel
4. **Advanced interventions**: More sophisticated rule-based corrections

## Key Takeaway

The SDK executor is now the default for Axiom MCP v3, providing proper streaming support as documented in the Claude Code SDK. This ensures real-time visibility into task execution while maintaining the intervention system that enforces actual implementation over planning.