# Axiom MCP v3 Help Manual

## Overview

Axiom MCP v3 is an advanced code generation system that uses Monte Carlo Tree Search (MCTS) to intelligently explore solution spaces. It solves the fundamental problems of:
- 30-second timeouts (using PTY instead of execSync)
- Deceptive completions (using system-level verification)
- Sequential blocking (using worker threads for parallelism)

## Architecture

### Core Components

1. **Master Controller** (Port 8080)
   - Manages task queue with priority scheduling
   - Spawns and manages worker threads
   - Runs WebSocket server for real-time monitoring
   - Handles intervention commands

2. **Worker Threads**
   - Each runs a Claude instance in a PTY
   - Streams output back to master
   - Parses TOOL_INVOCATION from output
   - Triggers verification on completion

3. **PTY Executor**
   - Prevents 30-second timeout with heartbeat
   - Captures all output in real-time
   - Supports long-running tasks (5s to 20min)

4. **System Verification**
   - Unhackable verification based on filesystem
   - Detects deceptive completion patterns
   - Checks actual files created and tests run
   - Provides proof for MCTS rewards

5. **WebSocket Server**
   - Real-time streaming on port 8080
   - Bidirectional communication
   - Intervention capabilities
   - HTML monitoring dashboard

## Available Tools

### Core Research Tools

#### axiom_mcp_goal
Clarifies and refines research goals through iterative questioning.
```json
{
  "goal": "What you want to research",
  "context": "Additional constraints",
  "depth": "quick|standard|deep"
}
```

#### axiom_mcp_explore
Executes parallel research branches using Claude subprocesses.
```json
{
  "topics": ["topic1", "topic2"],
  "mainGoal": "Overarching question",
  "tools": ["WebSearch", "Read"],
  "synthesize": true
}
```

#### axiom_mcp_chain
Recursive chain-of-goal research with automatic decomposition.
```json
{
  "goal": "Research goal",
  "maxDepth": 3,
  "autoDecompose": true,
  "strategy": "breadth-first|depth-first"
}
```

### Implementation Tools

#### axiom_mcp_spawn
Basic task spawning with pattern-based selection.
```json
{
  "parentPrompt": "Main task",
  "spawnPattern": "decompose|parallel|sequential|recursive",
  "spawnCount": 3,
  "autoExecute": true
}
```

#### axiom_mcp_spawn_mcts
Advanced spawning using Monte Carlo Tree Search.
```json
{
  "parentPrompt": "Main task",
  "mctsConfig": {
    "maxIterations": 20,
    "maxDepth": 3,
    "explorationConstant": 1.414
  }
}
```

#### axiom_mcp_implement
Execute implementation tasks with verification.
```json
{
  "task": "Implementation description",
  "contextFiles": ["file1.py", "file2.py"],
  "verifyWith": ["npm test", "npm run lint"],
  "acceptanceCriteria": {
    "testsPass": true,
    "hasWorkingCode": true
  }
}
```

### Analysis Tools

#### axiom_mcp_status
Check system status and task trees.
```json
{
  "action": "system|recent|task|tree|most_recent",
  "taskId": "optional-task-id",
  "limit": 10
}
```

#### axiom_mcp_tree
Visualize and analyze research trees.
```json
{
  "action": "visualize|analyze|export",
  "format": "text|mermaid|json|markdown",
  "depth": 3,
  "includeContent": false
}
```

#### axiom_mcp_verify
Verify implementation claims vs reality.
```json
{
  "action": "status|report|enforce",
  "taskId": "task-to-verify"
}
```

### Utility Tools

#### axiom_mcp_synthesis
Synthesize findings from context trees.
```json
{
  "contextId": "context-id",
  "depth": "summary|detailed|comprehensive",
  "includeChildren": true
}
```

#### axiom_mcp_merge
Merge findings from multiple branches.
```json
{
  "taskIds": ["task1", "task2"],
  "mergeStrategy": "synthesize|compare|deduplicate",
  "outputFormat": "unified|comparison|matrix"
}
```

#### axiom_mcp_docs
Access documentation sections.
```json
{
  "section": "overview|usage-guide|best-practices|troubleshooting"
}
```

## WebSocket Monitoring

Connect to `ws://localhost:8080` for real-time monitoring.

### Message Format
```json
{
  "type": "stream|task_update|verification|error",
  "taskId": "uuid",
  "data": { ... },
  "timestamp": "ISO-8601"
}
```

### Intervention Commands
```json
{
  "type": "intervene",
  "taskId": "uuid",
  "prompt": "Command to inject"
}
```

### HTML Dashboard
Open `src-v3/client/monitor.html` in a browser for visual monitoring.

## Verification System

### How It Works
1. Tracks all files created during task execution
2. Monitors process exit codes
3. Parses test output
4. Detects deceptive language patterns
5. Provides unhackable proof of implementation

### Deceptive Patterns Detected
- "I have created..." without actual files
- "Successfully implemented..." without working code
- "Tests are passing..." without test execution
- Claims without corresponding filesystem artifacts

### Verification Criteria
- `filesCreated`: Were expected files created?
- `testsPass`: Did tests execute successfully?
- `hasImplementation`: Is there real code (not just comments)?
- `coverageMet`: Does code meet coverage requirements?
- `noVulnerabilities`: Security scan passed?

## Best Practices

### For Research Tasks
1. Start with `axiom_mcp_goal` to clarify objectives
2. Use `axiom_mcp_explore` for broad investigation
3. Apply `axiom_mcp_chain` for deep dives
4. Synthesize with `axiom_mcp_merge`

### For Implementation Tasks
1. Use `axiom_mcp_spawn_mcts` for complex tasks
2. Always include verification criteria
3. Monitor via WebSocket for real-time feedback
4. Intervene if tasks go off track

### For Debugging
1. Check `axiom_mcp_status` for system state
2. Use `axiom_mcp_tree` to visualize execution
3. Run `axiom_mcp_verify` to check claims
4. Review JSONL logs in `logs-v3/`

## Common Issues

### Task Timeouts
- v3 uses PTY with heartbeat - no 30s timeout
- Tasks can run 5 seconds to 20+ minutes
- Check WebSocket for real-time progress

### Deceptive Completions
- System verification catches false claims
- Check verification reports for evidence
- Tasks marked failed if no real implementation

### Worker Crashes
- Master automatically spawns replacements
- Failed tasks are requeued
- Check logs for crash reasons

## Configuration

### Environment Variables
- `AXIOM_V3_MAX_WORKERS`: Number of parallel workers (default: 4)
- `AXIOM_V3_WEBSOCKET_PORT`: WebSocket port (default: 8080)
- `AXIOM_V3_LOG_DIR`: Log directory (default: ./logs-v3)

### MCP Installation
```bash
claude mcp add axiom-mcp -- node /path/to/axiom-mcp/dist-v3/src-v3/index.js
```

## Advanced Features

### MCTS Configuration
- `explorationConstant`: UCB1 exploration vs exploitation (default: √2)
- `maxIterations`: MCTS simulations per decision
- `maxDepth`: Maximum tree depth
- `minQualityThreshold`: Terminal node quality

### Meta-Cognitive Scoring
- BEFORE: What will you do?
- AFTER: What should success look like?
- HOW: How will you verify?
- Compliance affects MCTS rewards

### Port Graph
- Master allocates ports starting at 9000
- Inter-agent communication via HTTP
- Fire-and-forget message passing
- Parent tracks child port allocations

## Support

For issues or questions:
1. Check logs in `logs-v3/` directory
2. Use `axiom_mcp_status` for diagnostics
3. Monitor WebSocket for real-time info
4. Review verification reports

## Version History

### v3.0.0 (Current)
- PTY executor prevents timeouts
- Worker threads enable parallelism
- WebSocket real-time monitoring
- System-level verification
- MCTS integration

### v2.0.0
- Initial PTY implementation
- Event bus architecture
- Basic verification

### v1.0.0
- Original execSync implementation
- Basic MCTS design
- Frequent timeouts