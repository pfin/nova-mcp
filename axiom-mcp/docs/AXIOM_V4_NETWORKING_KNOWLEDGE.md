# Axiom V4 Networking Knowledge: Deep Dive into Process Communication

## Table of Contents
1. [Basic Concepts: How Computers Talk](#basic-concepts)
2. [Understanding Processes and IPC](#processes-and-ipc)
3. [The MCP Protocol Stack](#mcp-protocol-stack)
4. [Research Findings](#research-findings)
5. [Implementation Strategies](#implementation-strategies)
6. [Real-World Examples](#real-world-examples)

## Basic Concepts: How Computers Talk {#basic-concepts}

### What is a Process?
- A running program with its own memory space
- Has a Process ID (PID)
- Can't directly access another process's memory
- Must use Inter-Process Communication (IPC)

### Communication Methods
1. **Shared Memory** - Fastest, but complex synchronization
2. **Pipes** - Unidirectional byte streams (stdout/stdin)
3. **Sockets** - Network communication (TCP/UDP)
4. **Message Queues** - Async message passing
5. **Signals** - Simple notifications (SIGTERM, SIGKILL)

## Understanding Processes and IPC {#processes-and-ipc}

### File Descriptors: The Foundation
Every process has file descriptors:
- 0: stdin (input)
- 1: stdout (output)  
- 2: stderr (errors)
- 3+: files, sockets, pipes

### Pipes: How Shell Commands Connect
```bash
# This creates a pipe
ls | grep ".txt"

# What happens:
# 1. Shell creates pipe
# 2. Fork ls process, redirect stdout to pipe write end
# 3. Fork grep process, redirect stdin to pipe read end
# 4. Data flows: ls -> pipe -> grep
```

### Sockets: Network Communication
```
# TCP Socket Lifecycle:
1. Server: socket() -> bind() -> listen() -> accept()
2. Client: socket() -> connect()
3. Both: send()/recv() -> close()
```

## The MCP Protocol Stack {#mcp-protocol-stack}

### Layer Model
```
Application Layer: Your Tools (axiom_spawn, etc)
     |
Protocol Layer: JSON-RPC 2.0
     |
Transport Layer: stdio/HTTP/WebSocket
     |
OS Layer: Pipes/Sockets/TCP
```

### JSON-RPC Message Format
```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "axiom_spawn",
    "arguments": {...}
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{"type": "text", "text": "..."}]
  }
}
```

## Research Findings {#research-findings}

### Claude Code Hooks: Execution Model
Claude Code uses hooks to execute shell commands at lifecycle events:
- **Exit codes**: 0 (success), 2 (blocking error), other (non-blocking)
- **JSON stdout**: Can control flow and provide decisions
- **60-second timeout**: Per command execution
- **Full permissions**: Runs with user privileges
- **Parallel execution**: Multiple hooks can run simultaneously

### Node.js IPC Mechanisms
1. **stdio: ['pipe', 'pipe', 'pipe', 'ipc']**
   - Fourth element enables IPC channel
   - Uses JSON messages with newline delimiters
   - Enables `subprocess.send()` and `process.send()`

2. **Python-Node.js Communication**:
   ```javascript
   // Node.js spawning Python with IPC
   const { spawn } = require('child_process');
   const python = spawn('python', ['script.py'], {
     stdio: ['pipe', 'pipe', 'inherit', 'ipc']
   });
   
   python.on('message', (msg) => {
     console.log('From Python:', msg);
   });
   ```

   ```python
   # Python side using NODE_CHANNEL_FD
   import os
   import json
   fd = int(os.environ.get('NODE_CHANNEL_FD', 3))
   # Write JSON messages to fd
   ```

### MCP Transport Flexibility
From MCP documentation:
- **Transport agnostic**: Works over any bidirectional channel
- **Three main transports**: stdio, HTTP+SSE, WebSocket
- **Consistent message format**: JSON-RPC 2.0 across all transports
- **Stateful connections**: Maintains session across interactions

## Implementation Strategies {#implementation-strategies}

### Strategy 1: Multi-Transport Server
```typescript
class AxiomServer {
  // Accept connections from multiple transports
  private stdioTransport: StdioTransport;
  private httpTransport: HttpTransport;
  private wsTransport: WebSocketTransport;
  
  async start() {
    // Listen on all transports
    this.stdioTransport.start();
    this.httpTransport.listen(8080);
    this.wsTransport.listen(8081);
  }
}
```

### Strategy 2: Worker Pool Architecture
```
                    [Axiom Master]
                    Port 8080 (HTTP)
                    Port 8081 (WebSocket)
                         |
        +----------------+----------------+
        |                |                |
   [Worker 1]       [Worker 2]       [Worker 3]
   Connect back     Connect back     Connect back
   via WebSocket    via WebSocket    via WebSocket
```

### Strategy 3: Message Router Pattern
```typescript
interface Message {
  source: 'parent' | 'worker';
  workerId: string;
  type: 'command' | 'output' | 'interrupt';
  data: any;
}

class MessageRouter {
  route(msg: Message) {
    if (msg.source === 'parent') {
      this.workers.get(msg.workerId)?.send(msg);
    } else {
      this.parent.send(msg);
    }
  }
}
```

## Real-World Examples {#real-world-examples}

### Language Server Protocol (LSP)
- Similar to MCP: JSON-RPC over stdio/sockets
- VS Code spawns language servers as subprocesses
- Bidirectional communication for code intelligence

### Chrome DevTools Protocol
- Chrome spawns with `--remote-debugging-port=9222`
- Clients connect via WebSocket
- Full browser control through JSON messages

### Docker Architecture
- Docker daemon listens on unix socket
- CLI connects as client
- Containers are managed subprocesses

## The Axiom Solution: Hybrid Architecture {#axiom-solution}

### Key Insight: We Need THREE Components

1. **Axiom MCP Server** (what we have)
   - Receives commands from Claude via stdio
   - ALSO runs HTTP/WebSocket server on port 8080
   - Routes messages between Claude and workers

2. **axiom-worker** (new executable)
   ```bash
   axiom-worker --server ws://localhost:8080 --task-id abc123 --prompt "Create factorial.py"
   ```
   - Connects BACK to parent via WebSocket
   - Executes actual work (not Claude)
   - Streams output to parent
   - Can be interrupted via WebSocket

3. **axiom-client** (for external use)
   ```bash
   axiom-client --server http://localhost:8080 --command "npm test"
   ```
   - External processes can connect
   - Send commands to Axiom for monitoring
   - Receive interventions/corrections

### The Flow That Works

```
1. Claude calls axiom_spawn
2. Axiom Server:
   - Spawns: axiom-worker --server ws://localhost:8080 --task-id xyz
   - Returns immediately to Claude: "Task xyz started"
   - Worker connects back via WebSocket
3. Worker executes task:
   - Streams output through WebSocket
   - Parent monitors for violations
   - Parent can interrupt via WebSocket message
4. Claude continues working while worker runs
```

### Why This Solves Everything

1. **No Blocking**: axiom_spawn returns immediately after spawning worker
2. **Real Parallelism**: Multiple workers connect to different WebSocket connections
3. **Interrupts Work**: Send commands over WebSocket, not signals
4. **Observable**: All output flows through parent server
5. **Extensible**: External tools can connect as clients

### Implementation Code

```typescript
// In axiom-mcp/src-v4/index.ts - Add WebSocket server
import { WebSocketServer } from 'ws';

const wsServer = new WebSocketServer({ port: 8080 });
const workers = new Map<string, WebSocket>();

wsServer.on('connection', (ws, req) => {
  const url = new URL(req.url!, 'http://localhost');
  const taskId = url.searchParams.get('taskId');
  
  if (taskId) {
    workers.set(taskId, ws);
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      
      // Route worker output through hooks
      orchestrator.handleWorkerMessage(taskId, msg);
      
      // Check for violations
      if (msg.type === 'output') {
        const violations = checkViolations(msg.data);
        if (violations.length > 0) {
          // Send interrupt back to worker
          ws.send(JSON.stringify({
            type: 'interrupt',
            command: violations[0].fix
          }));
        }
      }
    });
    
    ws.on('close', () => {
      workers.delete(taskId);
    });
  }
});

// In PTY executor - spawn worker instead of claude
this.pty.write(`axiom-worker --server ws://localhost:8080 --task-id ${taskId} --prompt "${prompt}"\n`);
```

### Worker Implementation

```typescript
// axiom-worker/index.ts
#!/usr/bin/env node
import WebSocket from 'ws';
import { spawn } from 'child_process';

const args = process.argv.slice(2);
const server = args[args.indexOf('--server') + 1];
const taskId = args[args.indexOf('--task-id') + 1];
const prompt = args[args.indexOf('--prompt') + 1];

// Connect back to parent
const ws = new WebSocket(`${server}?taskId=${taskId}`);

ws.on('open', () => {
  console.log(`Worker ${taskId} connected to parent`);
  
  // Execute actual task (not Claude!)
  // Could be: Python script, npm command, API call, etc.
  const proc = spawn('python', ['-c', `
# Task: ${prompt}
print("Executing task...")
# Real implementation here
  `]);
  
  proc.stdout.on('data', (data) => {
    ws.send(JSON.stringify({
      type: 'output',
      taskId,
      data: data.toString()
    }));
  });
  
  proc.on('exit', (code) => {
    ws.send(JSON.stringify({
      type: 'complete',
      taskId,
      exitCode: code
    }));
    ws.close();
  });
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'interrupt') {
    console.log(`Interrupt: ${msg.command}`);
    // Handle interrupts
  }
});
```

This architecture transforms Axiom from trying to recursively call Claude (impossible) to a proper distributed system where workers execute tasks and report back.