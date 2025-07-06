# Axiom MCP v2.0 - From Theory to Implementation

> **⚠️ CRITICAL**: Axiom MCP v1.0 is fundamentally broken. It only produces research and plans, never actual code. This README describes v2.0, a complete rebuild using the Claude Code SDK and modern streaming architecture.

## The Problem We're Solving

**Current State (v1.0)**: "A calculator that can't add"
- Tasks marked ✅ "completed" without writing any code
- Excellent at research, terrible at implementation
- 30-second timeouts kill long-running tasks
- No real parallelism or streaming
- Verification exists but isn't enforced

**Future State (v2.0)**: Reliable Code Generation System
- Tasks only complete when code is written, tested, and verified
- Real-time streaming of all output
- True parallel execution with worker threads
- Support for 5-20 minute tasks
- Mandatory verification that can't be fooled

## Quick Start (v2.0 Alpha)

```bash
# Install dependencies including new requirements
npm install @anthropic-ai/claude-code node-pty chokidar ws simple-git

# Build the new streaming architecture
npm run build:v2

# Test with inspector (use SDK mode)
npx @modelcontextprotocol/inspector ./dist/v2/index.js

# Or use the new streaming CLI
./axiom-v2 stream
```

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│           Claude Code SDK                    │
│    (Streaming API + Interactive PTY)         │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           Event Bus + JSONL Ledger          │
│    (Real-time streaming + persistence)       │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           Worker Thread Pool                 │
│    (True parallel execution)                 │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         Verification Pipeline                │
│  (File checks + Test runs + Security scan)  │
└─────────────────────────────────────────────┘
```

## Key Features

### 1. SDK-First Streaming
```typescript
import { query } from "@anthropic-ai/claude-code";

// Stream responses with full control
for await (const delta of query({ prompt: "implement auth system" })) {
  eventBus.emit('claude_delta', delta);
}
```

### 2. PTY-Based Interactive Sessions
```typescript
import * as pty from 'node-pty';

// For long-running interactive tasks
const session = pty.spawn('claude', ['--dangerously-skip-permissions']);
session.onData(data => stream.write(data));
```

### 3. Mandatory Verification
```typescript
// Tasks MUST produce verifiable artifacts
const verification = await verifier.check(task);
if (!verification.filesExist || !verification.testsPass) {
  task.retry("No files created. Use Write tool to create calculator.py");
}
```

### 4. Real Worker Parallelism
```typescript
// Actually runs 4-8 tasks simultaneously
const pool = new WorkerPool({ min: 2, max: 8 });
await Promise.all(tasks.map(t => pool.execute(t)));
```

## What's Actually Implemented vs Planned

### ✅ Implemented (Working Today)
- Basic MCP server structure
- Tool definitions
- Subprocess spawning (broken)
- Verification logic (not wired up)
- Status tracking

### 🚧 In Progress (Sprint 0-1)
- Claude Code SDK integration
- Node-pty wrapper for interactive sessions
- Event bus with JSONL persistence
- Worker thread pool
- WebSocket streaming

### 📋 Planned (Sprint 2-6)
- MCTS with UCB1 selection
- Multi-layer parent-child DAG
- Cross-model verification
- Security scanning pipeline
- Distributed execution

## Core Technical Changes

### 1. Process Management
```typescript
// OLD (Broken)
const result = execSync(`claude -p "${prompt}"`, { timeout: 30000 });
// Always times out, no streaming

// NEW (Working)
const stream = await claudeSDK.stream(prompt);
for await (const delta of stream) {
  // Real-time output
}
```

### 2. Verification Integration
```typescript
// OLD (Optional)
task.complete(); // No checks

// NEW (Mandatory)
const proof = await verifier.gatherProof(task);
if (!proof.hasImplementation) {
  throw new Error("Cannot complete without implementation");
}
```

### 3. Event Architecture
```typescript
// NEW: Every action creates an event
eventBus.on('tool_call', async (event) => {
  ledger.append(event);
  monitor.broadcast(event);
  verifier.track(event);
});
```

## Installation & Setup

### Prerequisites
- Node.js 18+
- Claude CLI authenticated (`claude login`)
- Python 3.10+ (for verification)
- Git (for diff tracking)

### Environment Variables
```bash
# Required
export ANTHROPIC_API_KEY=your-key

# Optional
export AXIOM_WORKER_COUNT=4
export AXIOM_TASK_TIMEOUT=1200000  # 20 minutes
export AXIOM_VERIFICATION_STRICT=true
```

### Running Tests
```bash
# Unit tests
npm test

# Integration tests (requires Claude auth)
npm run test:integration

# Verification tests
npm run test:verification
```

## Usage Examples

### Basic Implementation Task
```typescript
// This will ACTUALLY create working code
await axiom.implement({
  task: "Create a Python web scraper with tests",
  requirements: {
    files: ["scraper.py", "test_scraper.py"],
    coverage: 80,
    security: true
  }
});
// Result: Real files that run and pass tests
```

### Long-Running Interactive Task
```typescript
// Supports 5-20 minute tasks with monitoring
await axiom.interactive({
  task: "Build complete REST API with auth",
  timeout: 20 * 60 * 1000,  // 20 minutes
  monitor: (event) => console.log(event),
  intervention: true  // Allow mid-task corrections
});
```

### Parallel Multi-Agent Execution
```typescript
// Actually runs in parallel, not sequential
const tasks = [
  "Implement user service",
  "Create auth middleware", 
  "Build API routes",
  "Write integration tests"
];

const results = await axiom.parallel(tasks, {
  workers: 4,
  verify: true,
  stream: true
});
```

## Monitoring & Observability

### Real-Time Dashboard
```bash
# Terminal UI
axiom-v2 monitor

# Web dashboard
axiom-v2 serve --port 8080
```

### Event Stream
```javascript
// Subscribe to live events
ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log(`[${event.timestamp}] ${event.type}: ${event.payload}`);
});
```

### Intervention API
```javascript
// Correct a task mid-execution
await axiom.intervention(taskId, {
  prompt: "Use pytest instead of unittest",
  timeout: 60000
});
```

## Migration Guide

### From v1.0 to v2.0

1. **Update Dependencies**
```bash
npm uninstall @modelcontextprotocol/server
npm install @anthropic-ai/claude-code node-pty ws
```

2. **Update Tool Definitions**
```typescript
// OLD
export const implementTool = {
  handler: async (args) => {
    return { status: "completed" }; // Lies
  }
};

// NEW
export const implementTool = {
  handler: async (args) => {
    const result = await worker.execute(args);
    const verified = await verifier.check(result);
    if (!verified.passed) throw new Error(verified.reason);
    return result;
  }
};
```

3. **Update System Prompts**
```typescript
// Remove research-focused prompts
// Add implementation-enforcing prompts
const SYSTEM_PROMPT = `
You MUST write actual code, not just describe it.
Use Write tool to create files.
Use Bash tool to run tests.
Your task is not complete until tests pass.
`;
```

## Troubleshooting

### Common Issues

**"Task completed but no files created"**
- This is the v1.0 behavior we're fixing
- Ensure you're using v2.0: `axiom-v2 --version`
- Check verification is enabled: `AXIOM_VERIFICATION_STRICT=true`

**"ETIMEDOUT after 30 seconds"**
- Old subprocess method detected
- Ensure SDK mode is enabled
- Check for `execSync` in stack trace

**"Cannot find module 'node-pty'"**
- Run `npm install` in v2 directory
- May need `npm rebuild` on some systems

## Contributing

We need help with:
1. Testing the Claude Code SDK integration
2. Improving verification patterns
3. Building the monitoring dashboard
4. Adding more language-specific verifiers

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## References

- [Technical Northstar v2.0](AXIOM_TECHNICAL_NORTHSTAR_V2.md)
- [Original Feedback](AXIOM_MCP_FEEDBACK.md)
- [Handoff Document](AXIOM_HANDOFF_QUESTIONS.md)
- [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk)
- [Implementation Analysis](GoodIdeasFromOtherModels.txt)

## License

MIT - See LICENSE

---

**Remember**: v1.0 only does research. v2.0 will actually implement. The difference is not incremental - it's fundamental.