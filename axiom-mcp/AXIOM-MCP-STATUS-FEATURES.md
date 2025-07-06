# Axiom MCP Status & Spawning Features

## Overview

Axiom MCP MCP server v0.3.0 now includes comprehensive status tracking, logging, and recursive task spawning capabilities.

## New Features

### 1. Status Management System

**StatusManager** class provides:
- Persistent task tracking across sessions
- Hierarchical task relationships (parent/child)
- Real-time status updates
- Automatic logging to files
- Context storage for each task

**Directory Structure:**
```
claude-code-mcp/
├── logs/          # Daily log files
├── contexts/      # Task context storage
└── status/        # Current status JSON
```

### 2. New MCP Tools

#### axiom_mcp_status

Check system status and manage state:

```typescript
// Actions available:
- 'system': Overall system status
- 'recent': Recent commands (with limit)
- 'task': Specific task details
- 'tree': Task hierarchy tree
- 'clear': Remove old tasks
```

Example usage:
```bash
# Check system status
axiom_mcp_status(action="system")

# View recent 5 tasks
axiom_mcp_status(action="recent", limit=5)

# View task tree
axiom_mcp_status(action="tree", taskId="task-uuid")
```

#### axiom_mcp_spawn

Execute tasks that spawn multiple subtasks:

```typescript
// Spawn patterns:
- 'decompose': Break task into subtasks
- 'parallel': Create parallel research questions
- 'sequential': Create ordered steps
- 'recursive': Core task with variations (supports depth)
```

Example usage:
```bash
# Decompose a task into 3 subtasks
axiom_mcp_spawn(
  parentPrompt="Build authentication system",
  spawnPattern="decompose",
  spawnCount=3,
  autoExecute=true
)

# Recursive spawning (tasks spawn more tasks)
axiom_mcp_spawn(
  parentPrompt="Research quantum computing",
  spawnPattern="recursive",
  spawnCount=3,
  maxDepth=3,
  autoExecute=true
)
```

### 3. Enhanced Logging

All operations are logged with:
- Console output (stderr)
- Daily log files in `logs/` directory
- Structured JSON status in `status/current.json`
- Task context saved in `contexts/`

### 4. Recursive Task Execution

The spawning system supports true recursion:
1. Parent task generates subtasks via Claude
2. First subtask in 'recursive' pattern spawns more tasks
3. Depth control prevents infinite recursion
4. All tasks tracked in hierarchical structure

## Implementation Details

### Parallel Execution Fix

Fixed the blocking issue with `execSync` by adding `executeAsync` method:
```typescript
async executeAsync(prompt: string, options?: ClaudeCodeOptions): Promise<ClaudeCodeResult> {
  const { stdout, stderr } = await execAsync(cmd, {
    encoding: 'utf-8',
    timeout: options.timeout || 600000,
    maxBuffer: 10 * 1024 * 1024,
  });
  // ...
}
```

### Task Status Tracking

Each task maintains:
```typescript
interface TaskStatus {
  id: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  output?: string;
  error?: string;
  childTasks?: string[];
  parentTask?: string;
  depth: number;
}
```

### Spawning Patterns

1. **Decompose**: Analyzes task and creates logical subtasks
2. **Parallel**: Generates independent research questions
3. **Sequential**: Creates ordered steps
4. **Recursive**: First subtask spawns more tasks up to maxDepth

## Usage Examples

### Check Status After Research
```bash
# Run parallel research
axiom_mcp_explore(topics=["API patterns", "Security"], mainGoal="Build secure API")

# Check status
axiom_mcp_status(action="system")

# View task tree
axiom_mcp_status(action="tree", taskId="<root-task-id>")
```

### Recursive Task Decomposition
```bash
# Start recursive decomposition
axiom_mcp_spawn(
  parentPrompt="Design microservices architecture",
  spawnPattern="recursive",
  spawnCount=3,
  maxDepth=3
)

# Monitor progress
axiom_mcp_status(action="recent", limit=20)
```

### View Logs
```bash
# Check today's log
cat logs/axiom-mcp-$(date +%Y-%m-%d).log

# View current status
cat status/current.json | jq
```

## Benefits

1. **Visibility**: See what Axiom MCP is doing in real-time
2. **Persistence**: Tasks survive server restarts
3. **Debugging**: Complete logs and task trees
4. **Scalability**: Handle complex recursive workflows
5. **Monitoring**: Track success/failure rates

## Future Enhancements

1. Web UI for status visualization
2. Task cancellation support
3. Resource usage tracking
4. Export task results to various formats
5. Integration with other MCP servers for cross-tool workflows