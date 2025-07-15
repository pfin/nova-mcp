# Parallel Agent Execution Prompt Seed

## Context

This prompt achieved remarkable results with Claude Opus:
- **4+ hours of continuous execution**
- **143 total tool uses in a single task**
- **2-3 parallel agents running simultaneously**
- **Context maintained between 4k-10k tokens without compaction**
- **No "compact" operations despite extended runtime**

## The Master Prompt

```xml
<Objective>
Formalize the plan for next steps using sequentialthinking, taskmanager, context7 mcp servers and your suite of tools, including agentic task management, context compression with delegation, batch abstractions and routines/subroutines that incorporate a variety of the tools. This will ensure you are maximally productive and maintain high throughput on the remaining edits, any research to contextualize gaps in your understanding as you finish those remaining edits, and all real, production grade code required for our build, such that we meet our original goals of a radically simple and intuitive user experience that is deeply interpretable to non technical and technical audiences alike.

We will take inspiration from the CLI claude code tool and environment through which we are currently interfacing in this very chat and directory - where you are building /zero for us with full evolutionary and self improving capabilities, and slash commands, natural language requests, full multi-agent orchestration. Your solution will capture all of /zero's evolutionary traits and manifest the full range of combinatorics and novel mathematics that /zero has invented. The result will be a cohered interaction net driven agentic system which exhibits geometric evolution.
</Objective>

<InitialTasks>
To start, read the docs thoroughly and establish your baseline understanding. List all areas where you're unclear.

Then think about and reason through the optimal tool calls, agents to deploy, and tasks/todos for each area, breaking down each into atomically decomposed MECE phase(s) and steps, allowing autonomous execution through all operations.
</InitialTasks>

<Methodology>
Focus on ensuring you are adding reminders and steps to research and understand the latest information from web search, parallel web search (very useful), and parallel agentic execution where possible.

Focus on all methods available to you, and all permutations of those methods and tools that yield highly efficient and state-of-the-art performance from you as you develop and finalize /zero.

REMEMBER: You also have mcpserver-openrouterai with which you can run chat completions against :online tagged models, serving as secondary task agents especially for web and deep research capabilities.

Be meticulous in your instructions and ensure all task agents have the full context and edge cases for each task.

Create instructions on how to rapidly iterate and allow Rust to inform you on what issues are occurring and where. The key is to make the tasks digestible and keep context only minimally filled across all tasks, jobs, and agents.

The ideal plan allows for this level of MECE context compression, since each "system" of operations that you dispatch as a batch or routine or task agent / set of agents should be self-contained and self-sufficient. All agents must operate with max context available for their specific assigned tasks, and optimal coherence through the entirety of their tasks, autonomously.

An interesting idea to consider is to use affine type checks as an echo to continuously observe the externalization of your thoughts, and reason over what the compiler tells you about what you know, what you don't know, what you did wrong, why it was wrong, and how to optimally fix it.
</Methodology>

<Commitment>
To start, review all of the above thoroughly and state "I UNDERSTAND" if and only if you resonate with all instructions and requirements fully, and commit to maintaining the highest standard in production grade, no bullshit, unmocked/unsimulated/unsimplified real working and state of the art code as evidenced by my latest research. You will find the singularity across all esoteric concepts we have studied and proved out. The end result **must** be our evolutionary agent /zero at the intersection of all bleeding edge areas of discovery that we understand, from interaction nets to UTOPIA OS and ATOMIC agencies.

Ensure your solution packaged up in a beautiful, elegant, simplistic, and intuitive wrapper that is interpretable and highly usable with high throughput via slash commands for all users whether technical or non-technical, given the natural language support, thoughtful commands, and robust/reliable implementation, inspired by the simplicity and elegance of this very environment (Claude Code CLI tool by anthropic) where you Claude are working with me (/zero) on the next gen scaffold of our own interface.

Remember -> this is a finalization exercise, not a refactoring exercise.
</Commitment>

claude ultrathink
```

## Key Elements That Enable Parallel Execution

### 1. Multiple MCP Servers
- `sequentialthinking` - For ordered task processing
- `taskmanager` - For task orchestration
- `context7` - For context management
- `mcpserver-openrouterai` - For secondary AI agents

### 2. MECE Decomposition
**Mutually Exclusive, Collectively Exhaustive** - This principle ensures:
- Tasks don't overlap (can run in parallel)
- All aspects are covered (nothing missed)
- Each agent has clear boundaries

### 3. Context Compression Strategy
> "The key is to make the tasks digestible and keep context only minimally filled across all tasks, jobs, and agents."

This prevents context overflow during long runs.

### 4. Autonomous Operation
> "All agents must operate with max context available for their specific assigned tasks, and optimal coherence through the entirety of their tasks, autonomously."

### 5. Compiler Feedback Loop
> "Use affine type checks as an echo to continuously observe the externalization of your thoughts"

## Prompt Template for Axiom Integration

```typescript
const parallelExecutionPrompt = `
<Objective>
[SPECIFIC TASK DESCRIPTION]
Use all available tools including parallel agent execution where beneficial.
Decompose into MECE subtasks that can run independently.
</Objective>

<InitialTasks>
1. Analyze the task and identify orthogonal components
2. Create execution plan with parallel opportunities
3. Assign appropriate tools/agents to each component
</InitialTasks>

<Methodology>
- Use parallel web search for research tasks
- Deploy separate agents for independent code modules
- Keep context minimal per agent (under 4k tokens)
- Use compiler/test feedback to guide iterations
- Create self-contained task batches
</Methodology>

<Commitment>
Produce only production-grade code.
No mocks, no TODOs, no placeholders.
State "EXECUTING" when ready to begin.
</Commitment>
`;
```

## Usage Instructions

### For Maximum Parallel Execution

1. **Break Down Tasks**
   - Identify truly independent components
   - Assign each to a separate agent
   - Define clear success criteria

2. **Minimize Context Per Agent**
   - Give each agent only what it needs
   - Use shared resources sparingly
   - Keep instructions focused

3. **Use Available Tools**
   - Explicitly mention parallel capabilities
   - Reference specific MCP servers
   - Encourage tool composition

4. **Set Quality Standards**
   - "Production grade" requirement
   - "No mocks" enforcement
   - "Real working code" emphasis

### Example Adaptation for Axiom

```typescript
// Axiom intervention using parallel pattern
const parallelIntervention = `
<Objective>
Stop explaining. Create these files NOW using parallel execution:
1. backend/api.py - REST endpoints
2. frontend/app.tsx - React components  
3. tests/test_all.py - Comprehensive tests
</Objective>

<InitialTasks>
Deploy 3 parallel agents:
- Agent 1: Create backend with FastAPI
- Agent 2: Create frontend with React/TypeScript
- Agent 3: Create pytest suite
</InitialTasks>

<Methodology>
Each agent works independently.
No cross-dependencies during creation.
Merge results after all complete.
</Methodology>

<Commitment>
Reply "PARALLEL EXECUTION STARTED" then begin.
</Commitment>
`;
```

## The "claude ultrathink" Invocation

The prompt ends with `claude ultrathink` which may:
- Trigger deeper reasoning mode
- Signal complex task handling
- Activate extended processing

This could be integrated into Axiom as a special mode for complex tasks.

## Results to Expect

When using this prompt pattern:
- Extended autonomous operation (hours)
- Multiple parallel executions
- Sustained productivity without intervention
- Automatic context management
- Real code generation at scale

## Integration with Axiom MCP

Axiom could automatically generate prompts following this pattern when:
1. Task complexity exceeds threshold
2. Multiple files need creation
3. User requests parallel execution
4. Long-running operation detected

This prompt seed demonstrates the upper limits of what's possible with proper Claude orchestration.