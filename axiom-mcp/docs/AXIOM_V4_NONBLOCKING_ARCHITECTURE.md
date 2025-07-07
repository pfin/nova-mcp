# Axiom V4 Non-Blocking Architecture: How to Avoid Getting Locked

## The Problem
If axiom_spawn waits for Claude to finish, we're locked until completion. We can't interrupt, can't start new tasks, can't do anything.

## The Solution: Fire-and-Forget with Notifications

### 1. NEVER await execution

```typescript
// WRONG - This locks us:
const result = await executor.execute(prompt);
return result;

// RIGHT - This returns immediately:
const taskId = taskManager.createTask(prompt);
executor.execute(prompt, taskId, streamHandler); // NO await!
return { taskId, status: "started" };
```

### 2. Use Notifications for Output

```typescript
// In the tool handler:
server.setRequestHandler(CallToolRequestSchema, async (request, { sendNotification }) => {
  if (request.params.name === 'axiom_spawn') {
    const taskId = taskManager.createTask(request.params.arguments.prompt);
    
    // Create notification sender
    const notificationSender = (data: string) => {
      sendNotification({
        method: "notifications/message",
        params: {
          level: "info",
          data: `[${taskId}] ${data}`
        }
      });
    };
    
    // Start execution WITHOUT awaiting
    ptyExecutor.execute(
      request.params.arguments.prompt,
      '',
      taskId,
      notificationSender
    ).then(() => {
      taskManager.completeTask(taskId);
      sendNotification({
        method: "notifications/message",
        params: {
          level: "info",
          data: `[${taskId}] Task completed`
        }
      });
    }).catch(err => {
      taskManager.failTask(taskId, err.message);
      sendNotification({
        method: "notifications/message",
        params: {
          level: "error",
          data: `[${taskId}] Task failed: ${err.message}`
        }
      });
    });
    
    // Return IMMEDIATELY
    return {
      content: [{
        type: 'text',
        text: `Task ${taskId} started. Watch notifications for output.`
      }]
    };
  }
});
```

### 3. Handle Multiple Concurrent Tasks

```typescript
// User can call axiom_spawn multiple times rapidly:
axiom_spawn({ prompt: "Create server.js" })     // Returns: task-001 started
axiom_spawn({ prompt: "Create database.js" })   // Returns: task-002 started  
axiom_spawn({ prompt: "Create auth.js" })       // Returns: task-003 started

// All three run in parallel, streaming via notifications:
[NOTIFICATION] [task-001] Creating Express server...
[NOTIFICATION] [task-002] Setting up database connection...
[NOTIFICATION] [task-003] Implementing authentication...
[NOTIFICATION] [task-001] File created: server.js
[NOTIFICATION] [task-002] File created: database.js
[NOTIFICATION] [task-003] File created: auth.js
```

### 4. Interrupt Without Blocking

```typescript
// Add interrupt tool
server.registerTool('axiom_interrupt', {
  description: 'Interrupt running task(s)',
  inputSchema: {
    taskId: z.string().optional(),
    pattern: z.string().optional()
  }
}, async ({ taskId, pattern }, { sendNotification }) => {
  let interrupted = 0;
  
  if (taskId) {
    // Interrupt specific task
    if (taskManager.interruptTask(taskId)) {
      interrupted++;
    }
  } else {
    // Interrupt based on pattern or all
    const tasks = taskManager.getRunningTasks();
    for (const task of tasks) {
      if (!pattern || task.prompt.includes(pattern)) {
        taskManager.interruptTask(task.taskId);
        interrupted++;
      }
    }
  }
  
  return {
    content: [{
      type: 'text', 
      text: `Interrupted ${interrupted} task(s)`
    }]
  };
});
```

### 5. Status Checking Without Blocking

```typescript
// Add status tool
server.registerTool('axiom_status', {
  description: 'Check status of tasks',
  inputSchema: {
    taskId: z.string().optional()
  }
}, async ({ taskId }) => {
  if (taskId) {
    const task = taskManager.getTask(taskId);
    return {
      content: [{
        type: 'text',
        text: task ? taskManager.formatTask(taskId) : 'Task not found'
      }]
    };
  } else {
    const running = taskManager.getRunningTasks();
    const summary = running.length > 0 
      ? running.map(t => taskManager.formatTask(t.taskId)).join('\n')
      : 'No tasks running';
    return {
      content: [{
        type: 'text',
        text: summary
      }]
    };
  }
});
```

## The Key Pattern: Command-and-Control

Instead of one blocking call, we have multiple non-blocking commands:

1. **axiom_spawn** - Starts task, returns immediately
2. **axiom_interrupt** - Interrupts running tasks
3. **axiom_status** - Checks what's running
4. **axiom_inject** - Sends commands to running tasks

All output flows through notifications, never blocking the main thread.

## Example Interaction Flow

```
User: axiom_spawn({ prompt: "Analyze all sorting algorithms in detail" })
System: Task task-001 started. Watch notifications for output.

[NOTIFICATION] [task-001] I'll analyze sorting algorithms comprehensively...
[NOTIFICATION] [task-001] 1. Bubble Sort: O(n²) complexity...
[NOTIFICATION] [task-001] 2. Quick Sort: Average O(n log n)...

User: axiom_spawn({ prompt: "Stop analyzing! Just implement quicksort.py" })
System: Task task-002 started. Watch notifications for output.

[NOTIFICATION] [task-002] I'll stop the analysis and implement quicksort.py...
[NOTIFICATION] [task-001] [INTERRUPTED]
[NOTIFICATION] [task-002] Creating quicksort.py...
[NOTIFICATION] [task-002] File created: quicksort.py
[NOTIFICATION] [task-002] Task completed
```

## Why This Works

1. **No Blocking**: axiom_spawn returns in milliseconds
2. **Full Visibility**: All output streams via notifications
3. **Total Control**: Can interrupt/redirect at any time
4. **Parallel Capable**: Run many tasks simultaneously
5. **Claude-Like UX**: See output as it happens, interrupt by sending new messages

## Implementation Checklist

- [ ] Make axiom_spawn non-blocking (no await)
- [ ] Set up notification streaming 
- [ ] Add TaskManager for tracking
- [ ] Implement axiom_interrupt tool
- [ ] Add axiom_status tool
- [ ] Test parallel execution
- [ ] Test interrupt scenarios

This architecture ensures we NEVER get locked waiting for Claude to finish!