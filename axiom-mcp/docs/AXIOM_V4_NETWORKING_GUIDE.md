# Axiom V4 Networking Guide: From Blocking to Parallel Execution

## The Problem We're Solving

Axiom v4 is currently blocked because it tries to run `claude --text "prompt"` as a subprocess, but this command doesn't exist. This guide explains how to fix it using proper networking architecture.

## Understanding How Processes Communicate

### 1. Current Architecture (Broken)

```
[Claude/User] 
     |
     | (calls axiom_spawn via MCP)
     v
[Axiom MCP Server]
     |
     | (tries to spawn)
     v
[PTY: claude --text "..."]  <-- BLOCKS FOREVER (no such command)
```

**Why it blocks:** The PTY executor creates a pseudo-terminal and writes `claude --text "prompt"`, then waits for output. Since there's no `claude` command, it waits forever.

### 2. How MCP Actually Works

MCP (Model Context Protocol) uses JSON-RPC messages over different transports:

#### Transport Types:
- **STDIO**: Read from stdin, write to stdout (what we use now)
- **HTTP/SSE**: HTTP requests + Server-Sent Events  
- **WebSocket**: Full duplex TCP connection

#### Current Flow:
```json
// Claude sends to Axiom's stdin:
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"axiom_spawn",...}}

// Axiom should respond on stdout:
{"jsonrpc":"2.0","result":{"content":[{"type":"text","text":"..."}]}}
```

### 3. The Networking Solution

Instead of trying to spawn Claude directly, we need a client-server architecture:

```
[Claude/User]
     |
     | (stdio)
     v
[Axiom MCP Server]
     |
     +--> Also listens on TCP port 8080
     |
     | (spawns)
     v
[axiom-worker --connect localhost:8080 --task "..."]
     |
     | (connects back via TCP)
     v
[Axiom MCP Server routes messages]
```

### 4. Implementation Steps

#### Step 1: Add HTTP/WebSocket Server to Axiom

```typescript
// In axiom-mcp/src-v4/index.ts
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// After creating MCP server
const httpServer = createServer();
const wsServer = new WebSocketServer({ server: httpServer });

wsServer.on('connection', (ws, req) => {
  const taskId = new URL(req.url, 'http://localhost').searchParams.get('taskId');
  
  ws.on('message', (data) => {
    // Route messages from worker back to parent
    orchestrator.handleWorkerMessage(taskId, data.toString());
  });
});

httpServer.listen(8080);
```

#### Step 2: Create axiom-worker Executable

```typescript
// New file: axiom-mcp/src-v4/worker/index.ts
#!/usr/bin/env node
import WebSocket from 'ws';
import { spawn } from 'child_process';

const args = process.argv.slice(2);
const server = args[args.indexOf('--server') + 1];
const taskId = args[args.indexOf('--task-id') + 1];
const prompt = args[args.indexOf('--prompt') + 1];

// Connect back to parent
const ws = new WebSocket(`ws://${server}?taskId=${taskId}`);

ws.on('open', () => {
  // Execute the actual task
  const proc = spawn('python', ['-c', `print("Executing: ${prompt}")`]);
  
  proc.stdout.on('data', (data) => {
    ws.send(JSON.stringify({
      type: 'output',
      taskId,
      data: data.toString()
    }));
  });
});
```

#### Step 3: Update PTY Executor

```typescript
// In pty-executor.ts
async execute(prompt: string, systemPrompt: string, taskId: string) {
  // Instead of:
  // this.pty.write(`claude --text "${prompt}"`);
  
  // Do this:
  const workerPath = path.join(__dirname, '../../dist-v4/worker/index.js');
  this.pty.write(`node ${workerPath} --server localhost:8080 --task-id ${taskId} --prompt "${prompt}"\n`);
}
```

### 5. How Messages Flow

1. **Parent -> Worker**:
   ```
   Claude -> (stdio) -> Axiom Server -> (WebSocket) -> Worker
   ```

2. **Worker -> Parent**:
   ```
   Worker -> (WebSocket) -> Axiom Server -> (stdio) -> Claude
   ```

3. **Interrupts**:
   ```
   Claude sends interrupt -> Axiom Server -> WebSocket message -> Worker kills process
   ```

### 6. Why This Works

- **No Blocking**: Parent spawns worker and returns immediately
- **Real Parallelism**: Multiple workers can connect to different ports
- **Interrupts**: Send commands over WebSocket connection
- **Observable**: All traffic routes through parent server
- **Standard Networking**: Uses TCP/HTTP/WebSocket, not magic

### 7. Testing the Architecture

```bash
# Terminal 1: Start Axiom with networking
AXIOM_NETWORK_PORT=8080 npx mcp axiom-mcp

# Terminal 2: Test worker directly
node dist-v4/worker/index.js --server localhost:8080 --task-id test123 --prompt "Create hello.py"

# Should see in Terminal 1:
# [NETWORK] Worker connected: test123
# [NETWORK] Worker output: Executing: Create hello.py
```

### 8. Next Evolution: Direct AI API Calls

Instead of trying to spawn Claude, workers could:
- Call OpenAI/Anthropic/Google APIs directly
- Use local models (Ollama, llama.cpp)
- Execute code directly
- Mix approaches based on task type

### 9. Key Insights

1. **MCP is transport-agnostic** - It's just JSON-RPC messages
2. **STDIO isn't the only option** - HTTP/WebSocket enables networking
3. **Workers need to connect back** - Not be called directly
4. **Ports enable parallelism** - Each worker gets a unique connection
5. **This is standard server architecture** - Nothing magical

### 10. The Path Forward

1. Implement HTTP/WebSocket server in Axiom
2. Create axiom-worker executable
3. Update executors to spawn workers
4. Add connection management
5. Implement message routing
6. Add interrupt handling
7. Test parallel execution

This transforms Axiom from a blocked recursive system to a proper distributed architecture.