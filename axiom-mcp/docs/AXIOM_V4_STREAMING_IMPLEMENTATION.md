# Axiom V4 Streaming Implementation

## Key Discovery: MCP Notifications = Streaming

MCP already supports streaming through the notification system:

```typescript
// During tool execution:
await sendNotification({
  method: "notifications/message",
  params: { 
    level: "info", 
    data: "Character-by-character output from Claude"
  }
});
```

## Implementation Strategy

### 1. Modify axiom_spawn Tool Handler

```typescript
// In src-v4/index.ts
server.setRequestHandler(CallToolRequestSchema, async (request, { sendNotification }) => {
  if (request.params.name === 'axiom_spawn') {
    const args = request.params.arguments;
    
    // Create stream handler that sends notifications
    const streamHandler = (data: string) => {
      sendNotification({
        method: "notifications/message",
        params: {
          level: "info",
          data: data
        }
      });
    };
    
    // Start execution with stream handler
    const result = await orchestrator.handleRequest('axiom_spawn', {
      ...args,
      streamHandler
    });
    
    // Return task started message
    return {
      content: [{
        type: 'text',
        text: `Task ${result.taskId} started. Output streaming via notifications.`
      }]
    };
  }
});
```

### 2. Update HookOrchestrator for Streaming

```typescript
// In hook-orchestrator.ts
async handleRequest(tool: string, args: any): Promise<any> {
  const taskId = `task-${Date.now()}`;
  const { streamHandler } = args;
  
  // For verbose mode or when streamHandler provided
  if (args.verboseMasterMode || streamHandler) {
    // Start execution in background
    const executionPromise = executor.execute(
      args.prompt,
      args.systemPrompt || '',
      taskId,
      streamHandler  // Pass through to PTY
    );
    
    // Return immediately
    return {
      taskId,
      status: 'streaming',
      message: 'Output streaming via notifications'
    };
  }
  
  // Traditional blocking mode
  const result = await executor.execute(...);
  return result;
}
```

### 3. PTY Executor Already Streams!

The PTY executor already has streaming built in:

```typescript
// In pty-executor.ts
this.pty.onData(async (data: string) => {
  this.output += data;
  
  // Stream to handler
  if (streamHandler) {
    streamHandler(data);  // This will trigger notifications!
  }
  
  // Process hooks
  if (this.hookOrchestrator) {
    // ... existing hook processing
  }
});
```

### 4. Handle Interrupts

```typescript
// New tool for interrupting
server.registerTool('axiom_interrupt', {
  description: 'Interrupt a running task',
  inputSchema: {
    taskId: z.string(),
    command: z.string().optional()
  }
}, async ({ taskId, command }) => {
  const task = orchestrator.getTask(taskId);
  if (task && task.executor) {
    task.executor.interrupt();
    if (command) {
      task.executor.write(command + '\n');
    }
  }
  return {
    content: [{
      type: 'text',
      text: `Task ${taskId} interrupted`
    }]
  };
});
```

## Testing the Implementation

### Test 1: Basic Streaming
```
1. Call axiom_spawn with verboseMasterMode: true
2. Should see notifications streaming Claude's output
3. File creation events appear in real-time
```

### Test 2: Interrupt Flow  
```
1. Start long task: axiom_spawn({ prompt: "Analyze sorting algorithms" })
2. See planning output streaming
3. Call axiom_interrupt({ taskId: "...", command: "Stop! Create quicksort.py" })
4. See Claude redirect to implementation
```

### Test 3: Parallel Streams
```
1. Call axiom_spawn with spawnCount: 3
2. Should see three streams with different task IDs
3. Each notification includes taskId for identification
```

## Code Changes Needed

1. **Update CallToolRequestSchema handler** to accept sendNotification
2. **Pass streamHandler through args** to orchestrator
3. **Create axiom_interrupt tool** for interrupting tasks
4. **Add task tracking** to orchestrator for interrupt handling
5. **Format notifications** to include task ID and type

## Expected User Experience

```
User: axiom_spawn({ prompt: "Create hello.py", verboseMasterMode: true })
System: Task task-123 started. Output streaming via notifications.

[NOTIFICATION] I'll create a simple hello.py file for you.
[NOTIFICATION] Creating hello.py with a basic print statement...
[NOTIFICATION] 
[NOTIFICATION] File created: hello.py
[NOTIFICATION] Task completed successfully.
```

## Implementation Timeline

1. **Step 1** (30 min): Update tool handler to use sendNotification
2. **Step 2** (30 min): Pass streamHandler through system
3. **Step 3** (30 min): Test basic streaming
4. **Step 4** (1 hour): Add interrupt handling
5. **Step 5** (30 min): Format output nicely
6. **Step 6** (1 hour): Test all scenarios

Total: ~4 hours to complete streaming implementation