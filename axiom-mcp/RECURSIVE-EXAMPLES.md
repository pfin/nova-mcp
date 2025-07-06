# Axiom MCP Recursive Examples

## Example 1: Simple Chain (No Recursion Needed)

```json
{
  "tool": "axiom_mcp_chain",
  "arguments": {
    "goal": "What are the benefits of TypeScript?"
  }
}
```

**Expected Flow**:
1. Analyzes goal → Simple, no decomposition needed
2. Executes directly
3. Returns findings

## Example 2: One Level Decomposition

```json
{
  "tool": "axiom_mcp_chain",
  "arguments": {
    "goal": "Compare React vs Vue for enterprise applications"
  }
}
```

**Expected Flow**:
1. Decomposes into:
   - React capabilities for enterprise
   - Vue capabilities for enterprise
   - Performance comparison
   - Ecosystem comparison
2. Executes all 4 sub-goals directly
3. Returns findings + synthesis instructions

## Example 3: Multi-Level Recursive Research

```json
{
  "tool": "axiom_mcp_chain",
  "arguments": {
    "goal": "Design a scalable microservices architecture for an e-commerce platform",
    "maxDepth": 3
  }
}
```

**Expected Flow**:
1. **Level 0**: Main goal decomposed into:
   - Technical architecture design → Complex, needs recursion
   - Data management strategy → Complex, needs recursion
   - Security implementation → Simple, execute directly
   - DevOps and deployment → Complex, needs recursion

2. **Returns**:
   - Security findings (completed)
   - Instructions to call 3 recursive sub-goals

3. **User calls**: 
```json
{
  "tool": "axiom_mcp_chain",
  "arguments": {
    "goal": "Technical architecture design",
    "parentContext": "ctx_abc123"
  }
}
```

4. **Level 1**: Decomposes into:
   - Service boundaries and APIs
   - Communication patterns
   - Technology stack selection
   (All simple enough to execute)

5. **Continue for other branches...**

6. **Final synthesis**:
```json
{
  "tool": "axiom_mcp_synthesis",
  "arguments": {
    "contextId": "ctx_root",
    "includeChildren": true,
    "depth": "comprehensive"
  }
}
```

## Example 4: Complex Parallel-Recursive Flow

**Initial Call**:
```json
{
  "tool": "axiom_mcp_chain",
  "arguments": {
    "goal": "Build an AI-powered code review system",
    "maxDepth": 4,
    "strategy": "breadth-first"
  }
}
```

**Expected Execution Tree**:
```
Build AI-powered code review system
├─ Technical feasibility study
│  ├─ AI model selection (GPT-4, CodeLlama, etc.)
│  ├─ Integration approaches (IDE, Git hooks, CI/CD)
│  └─ Performance requirements
├─ Implementation architecture [RECURSIVE]
│  ├─ Backend services design
│  │  ├─ API gateway
│  │  ├─ Review processing service
│  │  └─ Model inference service
│  ├─ Frontend design
│  └─ Data pipeline
├─ Security and compliance [RECURSIVE]
│  ├─ Code privacy measures
│  ├─ Authentication/authorization
│  └─ Audit logging
└─ Business considerations
   ├─ Pricing models
   ├─ Competitive analysis
   └─ Go-to-market strategy
```

## Manual Recursion Pattern

Since Claude Code can't call MCP tools, here's the pattern:

1. **Initial call** → Returns some results + recursive instructions
2. **Manual recursive calls** → Execute each instruction
3. **Check progress** → Some branches may need more recursion
4. **Final synthesis** → Combine all findings

### Full Example Flow:

```typescript
// Step 1: Initial goal
axiom_mcp_chain({ 
  goal: "Create AI startup business plan",
  maxDepth: 3 
})

// Returns:
// - Simple findings: market size, basic requirements
// - Instructions for 3 complex sub-goals

// Step 2: Execute each instruction
axiom_mcp_chain({ 
  goal: "Technical product development",
  parentContext: "ctx_123" 
})

axiom_mcp_chain({ 
  goal: "Go-to-market strategy",
  parentContext: "ctx_123" 
})

axiom_mcp_chain({ 
  goal: "Financial projections",
  parentContext: "ctx_123" 
})

// Step 3: Some may need further decomposition
// "Technical product development" returns:
// - MVP features (completed)
// - Instructions for "AI model architecture" (needs recursion)

axiom_mcp_chain({ 
  goal: "AI model architecture",
  parentContext: "ctx_456" 
})

// Step 4: Once all complete, synthesize
axiom_mcp_synthesis({ 
  contextId: "ctx_123",
  includeChildren: true,
  depth: "comprehensive" 
})
```

## Thread Management

The system automatically manages parallel execution:

```typescript
// This spawns 4 parallel Claude Code processes
axiom_mcp_explore({
  mainGoal: "Evaluate cloud providers",
  topics: ["AWS", "GCP", "Azure", "Cloudflare"],
  synthesize: true
})

// But recursive chains are sequential to manage resources
axiom_mcp_chain({
  goal: "Complex multi-part research"
  // Executes sub-goals one at a time or in small batches
})
```

## Context Persistence

Contexts are maintained in memory during the session:

```typescript
// First call creates ctx_abc123
axiom_mcp_chain({ goal: "Research X" })

// Later calls can reference it
axiom_mcp_chain({ 
  goal: "Deeper dive into aspect Y",
  parentContext: "ctx_abc123" 
})

// Final synthesis uses the full tree
axiom_mcp_synthesis({ 
  contextId: "ctx_abc123",
  includeChildren: true 
})
```

## Limitations & Best Practices

1. **No automatic recursion** - You must manually execute recursive calls
2. **Context lifetime** - Contexts only persist during MCP server session
3. **Resource usage** - Each branch spawns a Claude Code process
4. **Depth limits** - Set reasonable maxDepth (3-4 typically sufficient)

## Error Handling

If a branch fails:
```json
{
  "tool": "axiom_mcp_synthesis",
  "arguments": {
    "contextId": "ctx_root",
    "includeChildren": true
  }
}
```

Will show:
- Completed branches
- Failed/incomplete branches
- Instructions to retry failed branches