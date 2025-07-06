# Axiom MCP - Parallel Execution Observatory

Axiom MCP is transforming from a task planning tool into a **parallel execution observatory** that monitors, guides, and optimizes multiple implementation attempts in real-time.

> **🚨 v3.0 Critical Update**: We discovered v3 has all components but they're NOT CONNECTED. The system only does research, never implementation. Track the fix at [Issue #1](https://github.com/pfin/nova-mcp/issues/1).

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

## 🎯 The Vision

### Current Problem
- ❌ Provides excellent analysis about best practices
- ❌ Creates detailed plans for implementation
- ❌ Researches frameworks and methodologies
- **❌ Never writes a single line of actual code**

### The Solution: Parallel Execution Observatory

1. **Parallel Execution** - Multiple approaches in git worktrees
2. **Real-time Observation** - Monitor output character-by-character
3. **Intelligent Intervention** - Fix problems as they occur
4. **MCTS Optimization** - Allocate resources to promising approaches
5. **Success Amplification** - Extract and propagate working patterns

### Revolutionary Use Cases
- **Competitive Implementation Racing** - Multiple approaches race to implement features
- **Bug Hunt Swarms** - 10+ parallel attempts attack bugs from different angles
- **Architecture Evolution Chamber** - Test architectures in parallel universes

## 📅 Implementation Roadmap

### Phase 0: Fix Core Execution (THIS WEEK) 🚨
- [ ] Wire PTY Executor to axiom_mcp_spawn
- [ ] Add file change verification
- [ ] Implement "No TODO" rule
- [ ] Test with MCP inspector

### Phase 1-5: Full Vision (6 Weeks)
See [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) for complete plan.

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

## 🔍 The Philosophy

> "Don't plan for perfection. Execute in parallel, observe carefully, intervene intelligently, and synthesize success."

### Key Principles
1. **Execution Over Planning** - Real code > perfect plans
2. **Parallel Over Serial** - Many attempts > one attempt
3. **Observation Over Hope** - Watch what happens > assume it works
4. **Intervention Over Failure** - Fix immediately > let problems compound
5. **Synthesis Over Selection** - Combine best parts > pick single winner

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

## 📚 Essential Documentation

### Start Here
- [AXIOM_V3_VISION.md](./docs/AXIOM_V3_VISION.md) - **The complete vision**
- [USE_CASE_GUIDE.md](./docs/USE_CASE_GUIDE.md) - **See it in action**
- [IMPLEMENTATION_ROADMAP.md](./docs/IMPLEMENTATION_ROADMAP.md) - **Week-by-week plan**

### Deep Dives
- [TECHNICAL_DESIGN.md](./docs/TECHNICAL_DESIGN.md) - Architecture details
- [CURRENT_STATE.md](./docs/CURRENT_STATE.md) - What's built vs planned
- [V3_IMPLEMENTATION_LEARNINGS.md](./docs/V3_IMPLEMENTATION_LEARNINGS.md) - What we discovered

## 🐛 Known Issues

**Critical**: The system currently only produces research, not code. We're fixing this in Phase 0. Track progress at [Issue #1](https://github.com/pfin/nova-mcp/issues/1).

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