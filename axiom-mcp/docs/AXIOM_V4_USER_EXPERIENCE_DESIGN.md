# Axiom V4 User Experience Design: The Claude Chat Model

## Core Insight (January 7, 2025)

Axiom should mirror the Claude chat experience exactly:

```
User types → Claude streams response → User sees output in real-time → User can interrupt
```

## The Claude Chat Experience

### 1. Input Phase
- User types in a message box
- Hits enter/send
- Message is sent to Claude

### 2. Streaming Phase  
- Response starts streaming immediately
- User sees output character-by-character
- A timer/indicator shows Claude is working
- Output appears in real-time, not all at once

### 3. Interrupt Capability
- User can type and send a new message while Claude is streaming
- This interrupts the current generation
- Claude acknowledges the interrupt and responds to the new message

### 4. Completion Phase
- Timer/indicator disappears when done
- Full response is available
- User can continue the conversation

## How Axiom Should Work

### 1. Task Submission
```
axiom_spawn({ prompt: "Create a REST API" })
```
- Returns immediately with task ID
- Starts streaming output

### 2. Real-Time Streaming
```
[AXIOM] Task abc123 started
[CLAUDE] I'll create a REST API with the following structure:
[CLAUDE] 1. First, let me set up the project...
[FILE] Created: server.js
[CLAUDE] 2. Now adding authentication...
[FILE] Created: auth.js
```
- Output streams character-by-character
- File creation events appear inline
- Interventions appear as they happen

### 3. Interrupt/Intervention
While streaming, user can:
- Send a new axiom_spawn to redirect
- Send intervention commands
- Read partial output and react

```
[AXIOM] Task abc123 running...
[CLAUDE] Let me analyze the best approach...
[INTERVENTION] Stop planning! Create server.js now!
[CLAUDE] You're right, creating server.js...
[FILE] Created: server.js
```

### 4. Observable State
- Task status visible in real-time
- Output accessible before completion
- Multiple tasks can stream in parallel

## Technical Implementation

### MCP Streaming Response
MCP already supports streaming responses. We need to:

1. **Return immediately** from axiom_spawn with task info
2. **Stream output** through MCP's response streaming
3. **Handle interrupts** via new tool calls while streaming
4. **Track state** in the orchestrator

### PTY + Claude CLI
```typescript
// In PTY executor
this.pty.write(`claude "${prompt}"\n`);

// Stream output back through MCP
this.pty.onData((data) => {
  // This should stream to user in real-time
  streamHandler(data);
});
```

### Interrupt Handling
```typescript
// New message while streaming = interrupt
if (orchestrator.hasActiveTask(taskId)) {
  orchestrator.interrupt(taskId);
  orchestrator.sendIntervention("New priority: ...");
}
```

## User Workflows

### Workflow 1: Simple Task
1. User: `axiom_spawn({ prompt: "Create hello.py" })`
2. Axiom: Streams Claude's output as it works
3. User: Sees file being created in real-time
4. Complete: Task finishes, file exists

### Workflow 2: Intervention
1. User: `axiom_spawn({ prompt: "Analyze factorial implementations" })`
2. Axiom: Starts streaming Claude's analysis
3. User: Sees too much planning, sends interrupt
4. Axiom: `[INTERVENTION] Stop analyzing! Implement factorial.py now!`
5. Claude: Switches to implementation
6. Complete: Code is written, not just analyzed

### Workflow 3: Parallel Streaming
1. User: `axiom_spawn({ prompt: "Create API", spawnCount: 3, parallel: true })`
2. Axiom: Three Claude instances start streaming
3. User: Sees all three outputs with task prefixes
4. User: Can intervene in specific tasks
5. Complete: Best implementation wins

## Success Metrics

1. **Response Time**: < 100ms to start streaming
2. **Interrupt Latency**: < 500ms to acknowledge interrupt  
3. **Stream Quality**: Character-by-character, no buffering
4. **State Visibility**: Always know what's happening
5. **File Creation**: Visible in real-time

## Key Principles

1. **Stream Everything**: No waiting for completion
2. **Interrupt Anytime**: User maintains control
3. **Observable State**: See what's happening now
4. **Real-Time Feedback**: Know immediately if it's working
5. **Parallel Capable**: Multiple streams at once

## The Paradigm Shift

Traditional:
```
Request → Wait → Complete Response
```

Axiom V4:
```
Request → Stream → Observe → Intervene → Guide → Complete
```

This is not just about execution - it's about creating a collaborative, observable, interruptible workflow that gives users the same control over AI code generation that they have in Claude chat.