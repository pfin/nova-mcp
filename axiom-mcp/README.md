# Axiom MCP - Intelligent Research Tree System

Axiom MCP is a Model Context Protocol (MCP) server that implements intelligent task decomposition and execution using Monte Carlo Tree Search (MCTS), real-time intervention, and parallel processing.

> **⚠️ v3.0 In Development**: Major architecture overhaul to address implementation gaps. See [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) for details.

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/nova-mcp/axiom-mcp.git
cd axiom-mcp

# Install dependencies
npm install

# Build v3
npm run build:v3

# Test with MCP inspector
npm run inspect:v3
```

### Basic Usage

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "axiom-mcp": {
      "command": "node",
      "args": ["/path/to/axiom-mcp/dist-v3/src-v3/index.js"],
      "env": {
        "AXIOM_LOG_LEVEL": "info"
      }
    }
  }
}
```

## 🎯 Core Features

### v3 Architecture (In Development)

- **PTY Executor**: Prevents 30-second timeouts with pseudo-terminal execution
- **MCTS Engine**: Monte Carlo Tree Search for intelligent task exploration
- **Real-time Intervention**: Detects and corrects research-only behavior
- **Event System**: JSONL logging and WebSocket streaming
- **Prompt Configuration**: Task-aware and framework-specific prompts

### Current Capabilities

- 🌳 **Recursive Task Trees**: Decompose complex tasks into subtasks
- 🎯 **Goal Tracking**: Define and monitor success criteria
- 🔍 **Quality Evaluation**: Score and retry low-quality outputs
- 📊 **Visualizations**: Terminal-friendly tree and progress views
- 🔗 **Context Synthesis**: Merge findings from parallel branches
- 📈 **Status Monitoring**: Track system and task progress

## 📋 Available Tools

### Core Tools

#### `axiom_mcp_spawn`
Execute a task that spawns multiple subtasks with recursive capabilities.

```typescript
axiom_mcp_spawn({
  parentPrompt: "Build a REST API with authentication",
  spawnPattern: "decompose",
  maxDepth: 3,
  spawnCount: 3
})
```

#### `axiom_mcp_spawn_mcts`
Execute tasks using Monte Carlo Tree Search for intelligent exploration.

```typescript
axiom_mcp_spawn_mcts({
  parentPrompt: "Optimize database queries for performance",
  mctsConfig: {
    maxIterations: 20,
    explorationConstant: 1.414
  }
})
```

#### `axiom_mcp_tree`
Visualize and analyze research trees.

```typescript
axiom_mcp_tree({
  action: "visualize",
  format: "tree",
  includeContent: true
})
```

#### `axiom_mcp_status`
Check system status and recent activity.

```typescript
axiom_mcp_status({
  action: "most_recent",
  limit: 10
})
```

### Additional Tools
- `axiom_mcp_goal` - Define and refine research goals
- `axiom_mcp_explore` - Parallel research branches
- `axiom_mcp_chain` - Recursive chain-of-goal research
- `axiom_mcp_synthesis` - Synthesize findings
- `axiom_mcp_merge` - Merge branch findings
- `axiom_mcp_evaluate` - Evaluate task quality
- `axiom_mcp_implement` - Execute implementation tasks
- `axiom_mcp_verify` - Verify implementations

## ⚙️ Configuration

### Prompt Customization

Edit `prompt-config.json` to customize system behavior:

```json
{
  "systemPrompts": {
    "implementation": "You are an expert software engineer...",
    "research": "You are a thorough researcher..."
  },
  "frameworkPrompts": {
    "nextjs": "When working with Next.js App Router...",
    "database": "For database operations..."
  }
}
```

### Environment Variables

```bash
AXIOM_LOG_LEVEL=debug       # Logging level
AXIOM_MAX_WORKERS=4         # Max parallel tasks
AXIOM_PROMPT_CONFIG=./custom-prompts.json  # Custom prompts
```

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   MCP Client    │────▶│  Axiom MCP   │────▶│ PTY Executor│
└─────────────────┘     └──────┬───────┘     └─────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
              ┌─────▼─────┐        ┌──────▼──────┐
              │   MCTS    │        │ Intervention│
              │  Engine   │        │   System    │
              └───────────┘        └─────────────┘
```

## 🔍 Key Concepts

### Task Decomposition
Axiom automatically breaks complex tasks into manageable subtasks:

```
Build REST API
├── Design API endpoints
├── Implement authentication
│   ├── Setup JWT tokens
│   ├── Create user model
│   └── Build auth middleware
└── Add database integration
```

### Quality Scoring
Each task is scored based on:
- Completion status
- Code quality
- Test coverage
- Error handling

### Real-time Intervention
Prevents common AI pitfalls:
- Endless research loops
- Placeholder implementations
- Missing error handling
- Incomplete testing

## 🛠️ Development

### Building

```bash
# Build v3
npm run build:v3

# Watch mode
npm run dev:v3
```

### Testing

```bash
# Run tests
npm test

# Test with MCP inspector
npm run inspect:v3
```

### Debugging

Enable debug logs:
```bash
AXIOM_LOG_LEVEL=debug npm run start:v3
```

Check execution logs:
```bash
tail -f logs-v3/axiom-events-*.jsonl
```

## 🔧 Usage Examples

### Basic Task Decomposition

```typescript
// Spawn a task with subtasks
const result = await axiom_mcp_spawn({
  parentPrompt: "Build a user authentication system",
  spawnPattern: "decompose",
  spawnCount: 3,
  maxDepth: 3
});
```

### Monte Carlo Tree Search

```typescript
// Use MCTS for optimal path finding
const result = await axiom_mcp_spawn_mcts({
  parentPrompt: "Optimize application performance",
  mctsConfig: {
    maxIterations: 50,
    explorationConstant: 1.414,
    simulationMode: "mixed"
  }
});
```

### Quality Evaluation

```typescript
// Evaluate and retry low-quality outputs
const result = await axiom_mcp_evaluate({
  taskId: "task-123",
  evaluationType: "quality",
  parentExpectations: {
    requiredElements: ["working code", "tests", "documentation"],
    qualityThreshold: 0.8
  },
  autoRetry: true
});
```

## 📚 Documentation

- [Current State](./docs/CURRENT_STATE.md) - Detailed implementation status
- [Prompt Customization Guide](./docs/PROMPT_CUSTOMIZATION_GUIDE.md) - Customize prompts
- [V3 Complete Guide](./docs/V3_COMPLETE_GUIDE.md) - Full v3 documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Built with:
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk)
- [node-pty](https://github.com/microsoft/node-pty)
- TypeScript and Node.js