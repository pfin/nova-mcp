# Recursive Chain-of-Goal Design for Axiom MCP

## Current State Analysis

### What We Have:
- Two separate tools: `axiom_mcp_goal` and `axiom_mcp_explore`
- Each spawns independent Claude Code subprocesses
- No shared context between calls
- No ability to call itself recursively

### What's Missing:
- ❌ Claude Code can't call MCP tools (it's a subprocess)
- ❌ No context persistence between calls
- ❌ No recursive goal decomposition
- ❌ No way to merge results from self-calls

## Proposed Architecture

### Option 1: Orchestrator Pattern (Recommended)
```
Claude (You) 
    ↓
Axiom MCP MCP Server (Orchestrator)
    ├→ Decompose goal into sub-goals
    ├→ Store context in memory
    ├→ Spawn Claude Code for each sub-goal
    └→ Recursively call itself for complex sub-goals
```

### Option 2: Instruction-Based Recursion
```
Claude (You) → Axiom MCP → Claude Code
                                ↓
                        Returns instructions:
                        "Call axiom_mcp_goal with X"
                                ↓
                    You manually call again
```

## Recursive Implementation Design

### 1. Context Manager
```typescript
class ContextManager {
  private contexts: Map<string, Context> = new Map();
  
  interface Context {
    id: string;
    parentId?: string;
    goal: string;
    depth: number;
    findings: string[];
    subGoals: string[];
    status: 'pending' | 'exploring' | 'complete';
  }
  
  createContext(goal: string, parentId?: string): Context
  updateContext(id: string, findings: string[]): void
  getContext(id: string): Context
  getChildContexts(parentId: string): Context[]
  mergeContexts(contexts: Context[]): string
}
```

### 2. Recursive Goal Handler
```typescript
async function handleRecursiveGoal(goal: string, depth: number = 0): Promise<Result> {
  // Base case: Simple goal or max depth
  if (isSimpleGoal(goal) || depth >= MAX_DEPTH) {
    return executeDirectGoal(goal);
  }
  
  // Recursive case: Decompose
  const decomposition = await decomposeGoal(goal);
  const subGoalResults = [];
  
  for (const subGoal of decomposition.subGoals) {
    if (needsRecursion(subGoal)) {
      // PROBLEM: Can't actually call ourselves from Claude Code!
      // SOLUTION: Return instructions for manual recursion
      subGoalResults.push({
        type: 'recursive_instruction',
        goal: subGoal,
        instruction: `Call axiom_mcp_chain with: ${JSON.stringify({
          goal: subGoal,
          parentContext: context.id
        })}`
      });
    } else {
      // Execute directly
      const result = await claudeCode.execute(subGoal);
      subGoalResults.push(result);
    }
  }
  
  return synthesize(subGoalResults);
}
```

### 3. Chain Tool Design
```typescript
export const axiomMcpChainTool = {
  name: 'axiom_mcp_chain',
  description: 'Execute recursive chain-of-goal research',
  inputSchema: {
    goal: z.string(),
    maxDepth: z.number().default(3),
    strategy: z.enum(['breadth-first', 'depth-first']).default('breadth-first'),
    parentContext: z.string().optional(), // For manual recursion
  }
};
```

## Practical Examples

### Example 1: Simple Recursive Research
```
Goal: "Build a modern e-commerce platform"

Decomposition:
1. "Choose technology stack" → Direct execution
2. "Design system architecture" → Needs recursion:
   2.1. "Frontend architecture"
   2.2. "Backend microservices design"
   2.3. "Database schema"
3. "Plan implementation phases" → Direct execution

Returns:
- Results for 1 and 3
- Instructions to manually call:
  - axiom_mcp_chain({ goal: "Design system architecture", parentContext: "abc123" })
```

### Example 2: Parallel Recursive Exploration
```
Goal: "Compare AI frameworks for production use"

Parallel branches:
├─ "TensorFlow analysis" 
│   ├─ "Performance benchmarks" → Direct
│   └─ "Ecosystem evaluation" → Recursive
├─ "PyTorch analysis"
│   ├─ "Performance benchmarks" → Direct
│   └─ "Ecosystem evaluation" → Recursive
└─ "JAX analysis"
    ├─ "Performance benchmarks" → Direct
    └─ "Ecosystem evaluation" → Recursive

Returns mixed results + recursion instructions
```

## Implementation Strategy

### Phase 1: Add Context Persistence
```typescript
// In claude-subprocess.ts
export class ClaudeCodeSubprocess {
  private contextManager = new ContextManager();
  
  async executeWithContext(
    prompt: string, 
    parentContext?: string
  ): Promise<ClaudeCodeResult & { context: Context }> {
    const context = this.contextManager.createContext(prompt, parentContext);
    const result = await this.execute(prompt);
    
    this.contextManager.updateContext(context.id, [result.response]);
    
    return { ...result, context };
  }
}
```

### Phase 2: Add Decomposition Logic
```typescript
async function decomposeGoal(goal: string): Promise<Decomposition> {
  const prompt = `
You are Axiom MCP. Decompose this goal into sub-goals:
${goal}

Return a JSON structure:
{
  "subGoals": ["goal1", "goal2", ...],
  "strategy": "sequential|parallel",
  "complexity": "simple|moderate|complex"
}
`;

  const result = await claudeCode.execute(prompt);
  return JSON.parse(result.response);
}
```

### Phase 3: Handle Recursive Instructions
```typescript
interface RecursiveResult {
  directResults: ClaudeCodeResult[];
  recursiveInstructions: RecursiveInstruction[];
  synthesisPrompt: string;
}

interface RecursiveInstruction {
  goal: string;
  suggestedTool: 'axiom_mcp_goal' | 'axiom_mcp_explore' | 'axiom_mcp_chain';
  parentContext: string;
  reason: string;
}
```

## Limitations & Workarounds

### Can't Actually Self-Call
Since Claude Code subprocesses can't call MCP tools, we need workarounds:

1. **Return Instructions**: Tell the user what to call next
2. **Batch Planning**: Return all recursive calls needed upfront
3. **Context IDs**: Use IDs to maintain context across manual calls

### Thread Management
```typescript
class ThreadPool {
  private maxThreads = 5; // Limit parallel Claude instances
  private activeThreads = 0;
  private queue: Task[] = [];
  
  async execute(task: Task): Promise<Result> {
    if (this.activeThreads >= this.maxThreads) {
      return this.enqueue(task);
    }
    
    this.activeThreads++;
    try {
      return await task.execute();
    } finally {
      this.activeThreads--;
      this.processQueue();
    }
  }
}
```

## Usage Pattern

### Manual Recursive Flow:
```
1. User: axiom_mcp_chain({ goal: "Build AI startup" })
   
2. Response: 
   - Direct findings for simple parts
   - Instructions: "Call these next:
     - axiom_mcp_chain({ goal: "Technical architecture", parentContext: "ctx_123" })
     - axiom_mcp_chain({ goal: "Business model", parentContext: "ctx_123" })
     - axiom_mcp_chain({ goal: "Go-to-market", parentContext: "ctx_123" })"

3. User: Calls each instruction

4. Final call: axiom_mcp_synthesis({ contexts: ["ctx_123", "ctx_456", ...] })
```

## Next Steps

1. Implement context persistence
2. Add decomposition logic
3. Create chain tool with instruction generation
4. Add synthesis tool to merge contexts
5. Document the manual recursion pattern