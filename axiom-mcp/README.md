# Axiom MCP - Code-First Agent Orchestration System

Axiom MCP (Model Context Protocol) is an **implementation-focused** agent orchestration system that uses Claude Code as parallel workers to create recursive task trees that actually write, test, and verify code - not just plan it.

> **⚠️ Current Status**: Axiom MCP is undergoing a major redesign to address the fundamental issue that it only performs research without implementation. See [AXIOM_MCP_FEEDBACK.md](../AXIOM_MCP_FEEDBACK.md) for details on the limitations of the current version.

## Planned Features (v2.0 Redesign)

Based on [2025 AI agent research](https://www.emergence.ai/blog/towards-autonomous-agents-and-recursive-intelligence) and [user feedback](../AXIOM_MCP_FEEDBACK.md), the next version will include:

- 💻 **Code-First Execution**: Actually write and execute code, not just plan it
- 🔄 **Hierarchical Task DAG**: Recursive task decomposition with dependency tracking
- ✅ **Implementation Verification**: Test and validate all generated code
- 🛡️ **Security Validation**: Scan for vulnerabilities (51% of AI code has issues)
- 📊 **Context-Aware Generation**: Maintain full project context to avoid degradation
- 🎯 **Quality Gates**: Reject theoretical outputs, require concrete implementations
- ⚡ **Streaming Architecture**: Real-time output from parallel executions
- 🔍 **Agent2Agent Protocol**: Cross-framework interoperability

## Current Features (v0.5 - Research Only)

**WARNING**: These features only perform research and planning, not implementation:

- 🌳 **Recursive Research Trees**: Spawn tasks that spawn subtasks (but they don't implement)
- 🎯 **Goal-Oriented Success Metrics**: Track goals (but don't achieve them)
- 🔍 **Critical Evaluation**: Score outputs (but outputs are just plans)
- 🔄 **Smart Retry Logic**: Retry failed research (still won't write code)
- 📊 **Terminal Visualizations**: See your research tree (of unimplemented ideas)
- 🔗 **Context Merging**: Synthesize research (into more research)
- 📈 **Real-Time Monitoring**: Watch research happen (no code written)
- 🖥️ **Master Terminal**: Control research (not implementation)

## Authentication System

### MCP Authentication

The MCP (Model Context Protocol) uses token-based authentication to secure communication between clients and servers:

1. **Session Tokens**: When you start the MCP inspector or connect a client, a unique session token is generated
2. **Token Format**: 64-character hex string (e.g., `2a5740e3685f3a58e2c7bd3731ae2deea7e6dd270eae1004d3dc49cd85684175`)
3. **Usage**: Include the token in the URL when connecting: `http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=<token>`

### Disabling Authentication (Development Only)

For local development, you can disable authentication:

```bash
export DANGEROUSLY_OMIT_AUTH=true
npx @modelcontextprotocol/inspector ./dist/index.js
```

⚠️ **Warning**: Only disable auth in secure, local development environments.

### Claude Code Authentication

Axiom MCP uses Claude Code as subprocess workers. Authentication is handled through:

1. **Claude CLI**: Must be authenticated via `claude login`
2. **Session Persistence**: Claude maintains its own session tokens
3. **Subprocess Inheritance**: Child processes inherit parent's Claude authentication

## The Implementation Gap Problem

Based on extensive testing documented in [AXIOM_MCP_FEEDBACK.md](../AXIOM_MCP_FEEDBACK.md), the current architecture has a fundamental flaw:

**When asked to "create unit tests without mocks", Axiom MCP:**
- ✗ Provides excellent analysis about testing best practices
- ✗ Creates a detailed plan for what tests should cover
- ✗ Researches testing frameworks and methodologies
- **✗ Never writes a single line of test code**

This is not a bug - it's a design limitation. The system prompts focus on research and planning, not implementation.

## Redesign Based on 2025 AI Agent Research

### Key Insights from Recent Research:

1. **Recursive Intelligence**: Modern AI agents must be able to "improve themselves over time without human intervention" and actually implement solutions, not just plan them ([Emergence AI, 2025](https://www.emergence.ai/blog/towards-autonomous-agents-and-recursive-intelligence))

2. **Code Quality Crisis**: 51.24% of AI-generated programs contain vulnerabilities ([FormAI, 2025](https://medium.com/@adnanmasood/security-analysis-and-validation-of-generative-ai-produced-code-d4218078bd63)). This requires implementation verification, not just planning.

3. **Context Gaps**: 44% of developers blame missing context for AI-degraded quality ([Qodo State of AI Code Quality, 2025](https://www.qodo.ai/reports/state-of-ai-code-quality/)). Planning without implementation loses critical context.

4. **Hierarchical Task DAGs**: Deep Agent models use recursive two-stage planner-executor architecture that enables continuous task refinement ([Autonomous Deep Agent, 2025](https://arxiv.org/html/2502.07056v1))

### Proposed Architecture Changes:

```typescript
// Current (Research Only)
axiom_mcp_spawn({
  parentPrompt: "Create unit tests",
  // Result: Essay about testing

// Proposed (Implementation First)
axiom_mcp_implement({
  task: "Create unit tests",
  verifyWith: ["npm test", "coverage report"],
  securityScan: true,
  contextFiles: ["src/**/*.ts"],
  acceptanceCriteria: {
    coverageThreshold: 80,
    allTestsPass: true,
    noSecurityIssues: true
  }
})
// Result: Actual test files that run and pass

// NEW: Interactive Mode for Long-Running Tasks (5-20 minutes)
axiom_mcp_implement({
  task: "Implement complete authentication system with OAuth2",
  useInteractive: true,  // Enable real-time monitoring and control
  maxRetries: 5,
  acceptanceCriteria: {
    hasWorkingCode: true,
    testsPass: true,
    noSecurityIssues: true
  }
})
// Result: Real-time progress, adaptive prompting, guaranteed implementation
```

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd axiom-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Add to Claude MCP
claude mcp add axiom-mcp -- node /path/to/axiom-mcp/dist/index.js
```

## Quick Start

### 1. Using with Claude

Once installed as an MCP server, Claude will have access to these tools:

```
axiom_mcp_spawn      - Spawn recursive research tasks
axiom_mcp_evaluate   - Critically evaluate task outputs
axiom_mcp_goals      - Define and track success metrics
axiom_mcp_tree       - Visualize research trees
axiom_mcp_status     - Check system status
axiom_mcp_merge      - Merge findings from branches
axiom_mcp_visualize  - Terminal-friendly visualizations
```

### 2. Master Terminal (Recommended)

Launch the master terminal for complete control:

```bash
npm run axiom-master
# or
./axiom-master
```

Master terminal commands:
- `project myapp /path/to/app` - Create/switch projects
- `spawn <description>` - Start recursive research
- `status` - View system status
- `list` - List all projects
- `stream on/off` - Toggle streaming updates
- `help` - Show all commands

### 3. Basic Research Example

```javascript
// Spawn a recursive research tree
axiom_mcp_spawn(
  parentPrompt="Research best practices for API security",
  spawnPattern="recursive",
  spawnCount=3,
  maxDepth=5,
  autoExecute=true,
  autoEvaluate=true,
  qualityThreshold=0.7
)

// Check progress
axiom_mcp_status(action="system")

// Visualize the tree
axiom_mcp_visualize(format="tree", showMetrics=true)
```

## Terminal Visualizations

Axiom MCP provides multiple visualization formats optimized for terminal/console viewing:

### Tree Format
```
╔══════════════════════════════════════════════════════════════════════════════╗
║                           AXIOM MCP RESEARCH TREE                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Total Tasks: 15                                      Depth: 5                 ║
║ ✓ 12 Completed              ⟳ 2 Running             ✗ 1 Failed               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ ✓ Research API security best practices... (4.2s)                             ║
║ ├── ✓ Authentication mechanisms... (3.1s)                                     ║
║ │   ├── ✓ OAuth2 implementation... (2.8s)                                    ║
║ │   ├── ✓ JWT best practices... (2.5s)                                       ║
║ │   └── ⟳ API key management...                                              ║
║ ├── ✓ Rate limiting strategies... (3.5s)                                      ║
║ └── ⟳ Input validation techniques...                                         ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Progress Format
```
RESEARCH PROGRESS
=================

Overall: [████████████████████░░░░░░░░░░] 80%

Progress by Level:
  L0: [████████████████████] 100% (1/1)
  L1: [████████████████░░░░] 80% (4/5)
  L2: [██████████████░░░░░░] 70% (7/10)
  L3: [████████████░░░░░░░░] 60% (6/10)

Task Status:
  ✓ Completed: 12 (80%)
  ⟳ Running:   2 (13%)
  ⏳ Pending:   0 (0%)
  ✗ Failed:    1 (7%)

Time Statistics:
  Total: 45.3s
  Average: 3.8s per task
```

### Compact Format
```
=== Research Tree [15 tasks, depth 5] ===
Status: ✓12 ⟳2 ✗1 ⏳0

[✓] Research API security best practices... (4.2s)
│ [✓] Authentication mechanisms... (3.1s)
│ │ [✓] OAuth2 implementation... (2.8s)
│ │ [✓] JWT best practices... (2.5s)
│ │ [⟳] API key management...
│ [✓] Rate limiting strategies... (3.5s)
│ [⟳] Input validation techniques...
```

## Critical Evaluation System

The system automatically evaluates task outputs and rejects low-quality results:

```javascript
axiom_mcp_evaluate(
  taskId="task-123",
  evaluationType="quality",
  parentExpectations={
    requiredElements: [
      "Specific implementation details",
      "Security considerations",
      "Performance implications",
      "Code examples"
    ],
    qualityThreshold: 0.7,
    rejectIfMissing: ["Code examples", "Security considerations"]
  },
  autoRetry=true,
  maxRetries=3
)
```

## Goal-Oriented Research

Define measurable success criteria that propagate through the tree:

```javascript
axiom_mcp_goals(
  action="define",
  taskId=rootTask.id,
  goalDefinition={
    objective: "Comprehensive API security guide",
    successCriteria: [
      "Cover OWASP API Top 10",
      "Include implementation examples",
      "Address performance trade-offs",
      "Provide testing strategies"
    ],
    constraints: [
      "Focus on REST APIs",
      "Use modern standards (2024-2025)",
      "Include rate limiting"
    ],
    priority: "high"
  }
)
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Master Terminal                        │
│  - Project management                                    │
│  - Real-time streaming                                   │
│  - Command interface                                     │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│                    Axiom MCP Core                        │
│  - Task spawning and management                         │
│  - Quality evaluation                                    │
│  - Goal tracking                                         │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│               Claude Code Subprocesses                   │
│  - Parallel execution                                    │
│  - Streaming output                                      │
│  - Context preservation                                  │
└─────────────────────────────────────────────────────────┘
```

## Advanced Features

### Streaming Architecture

All operations support real-time streaming:
- Child tasks stream to parents
- Parents aggregate and stream to master
- Master terminal displays unified stream
- Web dashboard for external monitoring

### Context Merging

Synthesize findings from multiple branches:

```javascript
axiom_mcp_merge(
  taskIds=["task-1", "task-2", "task-3"],
  mergeStrategy="synthesize",  // or "compare", "deduplicate", "hierarchical"
  outputFormat="unified"        // or "comparison", "matrix"
)
```

### Tree Export

Export research trees in various formats:

```javascript
axiom_mcp_tree(
  action="export",
  taskId=rootTask.id,
  format="mermaid"  // or "json", "markdown"
)
```

## Best Practices

1. **Start with Clear Goals**: Define success criteria before spawning tasks
2. **Set Quality Thresholds**: Use evaluation to maintain high standards
3. **Monitor Progress**: Use status and visualization tools frequently
4. **Handle Failures**: Let the system retry with enhanced prompts
5. **Merge Strategically**: Combine findings at logical points

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure Claude CLI is authenticated: `claude login`
   - Check MCP token in inspector URL
   - Try `DANGEROUSLY_OMIT_AUTH=true` for local testing

2. **Task Timeouts**
   - Adjust timeout in spawn options
   - Break down complex tasks
   - Check system resources

3. **Quality Rejections**
   - Review evaluation criteria
   - Check parent expectations
   - Examine retry prompts

### Debugging

Enable debug logging:
```bash
export DEBUG=axiom:*
npm run axiom-master
```

View logs:
```bash
tail -f logs/axiom-mcp-*.log
```

## Integration with 2025 AI Agent Techniques

### Multi-Agent Orchestration Patterns

Based on recent research, we're incorporating these proven patterns:

1. **Hierarchical Orchestration** ([IBM, 2025](https://www.ibm.com/think/topics/ai-agent-orchestration))
   - Higher-level orchestrator agents manage lower-level implementation agents
   - Balances strategic control with task-specific execution
   - Enables specialized agents with focused responsibilities

2. **Agent2Agent Protocol** ([Google ADK, 2025](https://developers.googleblog.com/en/agent-development-kit-easy-to-build-multi-agent-applications/))
   - Cross-framework interoperability
   - Parallel execution patterns
   - Dynamic routing based on task requirements

3. **Quality-First Workflows** ([Qodo, 2025](https://www.qodo.ai/reports/state-of-ai-code-quality/))
   - AI agents guided by quality-focused workflows
   - Smart guardrails for trusted development
   - Full SDLC support with code reviews and test generation

### Implementation Techniques from Research

```typescript
// Technique 1: Recursive Task DAG with Implementation Focus
interface TaskDAG {
  id: string;
  type: 'plan' | 'implement' | 'verify' | 'deploy';
  dependencies: string[];
  implementation: {
    code?: string;
    tests?: string;
    verification?: VerificationResult;
  };
  children: TaskDAG[];
}

// Technique 2: Context-Aware Code Generation
interface CodeContext {
  projectStructure: FileTree;
  dependencies: Package[];
  existingPatterns: CodePattern[];
  testFramework: TestConfig;
  securityRequirements: SecurityPolicy[];
}

// Technique 3: Multi-Stage Verification
interface VerificationPipeline {
  stages: [
    'syntaxCheck',
    'typeCheck', 
    'unitTest',
    'integrationTest',
    'securityScan',
    'performanceProfile'
  ];
  acceptanceCriteria: AcceptanceCriteria;
  rollbackOnFailure: boolean;
}
```

### Addressing Known Issues

1. **Context Degradation** (44% of AI failures)
   - Maintain full project context across all agents
   - Pass file contents, not just references
   - Preserve coding patterns and conventions

2. **Security Vulnerabilities** (51.24% of AI code)
   - Mandatory security scanning on all generated code
   - Integration with OWASP scanning tools
   - Vulnerability feedback loop for agent learning

3. **Missing Implementation** (Current Axiom MCP issue)
   - Enforce "code-first" system prompts
   - Reject responses without executable code
   - Require test execution before task completion

## Roadmap

### Phase 1: Core Implementation (Q1 2025)
- [ ] Rewrite system prompts to enforce implementation
- [ ] Add code execution verification to all tools
- [ ] Implement security scanning pipeline
- [ ] Create test generation and execution framework

### Phase 2: Advanced Orchestration (Q2 2025)
- [ ] Implement Hierarchical Task DAG system
- [ ] Add Agent2Agent protocol support
- [ ] Build context preservation system
- [ ] Create quality gate framework

### Phase 3: Enterprise Features (Q3 2025)
- [ ] Add federated orchestration for multi-org collaboration
- [ ] Implement compliance and audit trails
- [ ] Build performance profiling system
- [ ] Create deployment pipeline integration

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

MIT License - see LICENSE file for details.