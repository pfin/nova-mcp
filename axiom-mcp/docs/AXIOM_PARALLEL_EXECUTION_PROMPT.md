# Axiom MCP Parallel Execution Master Prompt

## Purpose
This prompt is designed to achieve maximum parallel execution for building Axiom MCP's modular architecture, inspired by the successful 4+ hour parallel agent execution demonstrated in the community.

## The Axiom Master Prompt

```xml
<Objective>
Formalize the complete implementation of Axiom MCP using parallel agent execution, task decomposition, and your full suite of tools including Task agents, file operations, code generation, and real-time monitoring. This will ensure maximum productivity in building our modular intervention system that forces Claude instances to write code instead of explanations, achieving our goal of transforming AI from describers into builders.

We will implement Axiom MCP as a suite of modular components that work in concert: @axiom/pty-control for PTY management, @axiom/pattern-engine for detection, @axiom/intervention for behavior modification, @axiom/orchestrator for parallel execution, @axiom/monitor for metrics, and @axiom/commons for shared utilities. Your solution will manifest the core philosophy: "Make AI code, not talk" through real-time intervention and parallel orchestration.
</Objective>

<InitialTasks>
To start, read all existing Axiom documentation in axiom-mcp/docs/ and src-v4/ to establish baseline understanding. List all technical decisions needed.

Then deploy parallel agents for each module, breaking down implementation into atomically decomposed MECE phases:
- Agent 1: PTY Control Module (spawn, write, interrupt, kill)
- Agent 2: Pattern Engine (churning detection, planning detection, success indicators)
- Agent 3: Intervention System (gentle nudge, forceful command, control sequences)
- Agent 4: Orchestrator (parallel worktrees, task distribution, result merging)
- Agent 5: Monitor (metrics, anomaly detection, performance tracking)
- Agent 6: Integration Tests (end-to-end validation of all modules)
</InitialTasks>

<Methodology>
Focus on parallel implementation where each agent owns its module completely. Use TypeScript with strict typing throughout. Each module must have:
- Clean exported interfaces
- Zero external dependencies between modules during creation
- Comprehensive error handling
- Real implementations only - NO MOCKS, NO STUBS, NO PLACEHOLDERS

REMEMBER: You have these tools available:
- Task for parallel agent spawning
- Read/Write/Edit for file operations
- Bash for compilation and testing
- TodoWrite for tracking progress across agents
- WebSearch for researching best practices

Be meticulous in ensuring each agent has full context for its module but minimal awareness of others. The key is digestible, self-contained work units that compile independently.

The ideal plan uses git worktrees for true parallel development:
- Each agent works in its own worktree
- No merge conflicts during development
- Clean integration at the end

Use TypeScript compiler feedback as continuous validation. Let tsc inform you immediately when interfaces don't align, types are wrong, or integrations fail.
</Methodology>

<ArchitectureSpec>
Core modules to implement in parallel:

@axiom/pty-control:
- PtyController class with spawn, write, read, interrupt, kill
- Control character processing (\r, \n, \x1b, \x03)
- Session management and lifecycle
- Stream-based output handling

@axiom/pattern-engine:
- Pattern registry with built-in patterns
- Real-time analysis of Claude output
- Churning detection (tokens without progress)
- Planning detection ("I'll help", "Let me explain")
- Success detection (file creation events)

@axiom/intervention:
- Intervention strategies (gentle, forceful, terminal)
- Message templating for different scenarios
- Control sequence injection
- Validation of intervention success

@axiom/orchestrator:
- Multi-Claude instance management
- Worktree creation and isolation
- Task distribution algorithms
- Result aggregation and conflict resolution

@axiom/monitor:
- Real-time metrics collection
- Performance anomaly detection
- Intervention success rates
- Token-to-code ratios

@axiom/commons:
- Shared TypeScript interfaces
- Event bus for module communication
- Logger with module namespacing
- Configuration management
</ArchitectureSpec>

<QualityRequirements>
Every line of code must be:
- Production-grade TypeScript
- Fully typed with no 'any'
- Error handled appropriately
- Tested with real scenarios
- Documented with JSDoc

NO theoretical implementations
NO mock objects or fake data
NO "TODO: implement later"
NO simplified versions
</QualityRequirements>

<Commitment>
Review all requirements and module specifications thoroughly. State "INITIATING PARALLEL AXIOM BUILD" if and only if you understand:
1. Each module will be built by a separate parallel agent
2. All code must be production-ready on first write
3. No mocks or placeholders allowed
4. Real PTY control of actual Claude instances
5. Intervention system that forces code generation

The end result must be a working Axiom MCP that can:
- Spawn multiple Claude instances in parallel
- Detect when they're describing instead of coding
- Intervene with targeted messages
- Force actual file creation
- Monitor and report on effectiveness

Your implementation will be elegant yet powerful, with clean module boundaries and seamless integration, embodying the principle that AI should write code, not explanations.

Remember -> this is implementation, not planning. Write the code.
</Commitment>

claude ultrathink
```

## Key Adaptations for Axiom

### 1. Module-Specific Agents
Instead of a general task, each agent owns a specific Axiom module, ensuring true parallel development.

### 2. Concrete Specifications
Each module has clear interfaces and requirements defined upfront, preventing drift.

### 3. Anti-Pattern Enforcement
Multiple reinforcements against mocks, TODOs, and theoretical code.

### 4. Compiler-Driven Development
Using TypeScript's compiler as continuous validation, similar to the Rust approach in the original.

### 5. Quality Gates
Explicit requirements for production-grade code from the start.

## Expected Execution Pattern

When this prompt is used:

1. **Parallel Spawning**: 6+ agents start simultaneously
2. **Independent Development**: Each builds its module in isolation
3. **Continuous Progress**: Agents work for hours without intervention
4. **Real Implementation**: Actual working code, not descriptions
5. **Clean Integration**: Modules compose seamlessly at the end

## Usage Example

```typescript
// Deploy the master prompt
await axiom_spawn({
  prompt: AXIOM_PARALLEL_EXECUTION_PROMPT,
  agents: 6,
  worktrees: true,
  timeout: '4h',
  monitoring: 'real-time'
});

// Monitor all agents
const dashboard = await axiom_monitor_parallel({
  showMetrics: true,
  interventionThreshold: 60 // seconds without file creation
});

// Aggregate results
const modules = await axiom_merge_modules({
  strategy: 'clean-integration',
  runTests: true,
  buildAll: true
});
```

## Success Metrics

A successful execution will produce:
- 6 working npm packages
- 200+ TypeScript files
- 95%+ code coverage
- 0 mock implementations
- Clean module boundaries
- Working end-to-end demos

## The "claude ultrathink" Power

This invocation at the end signals deep, sustained reasoning mode - perfect for the complex parallel orchestration required to build Axiom itself.

## Result

This prompt transforms the original's general-purpose power into Axiom-specific parallel execution, maintaining all the key elements that enabled 4+ hour autonomous operation while focusing on our goal: making AI write code, not talk.