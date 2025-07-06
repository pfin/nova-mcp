# Axiom MCP MCP - Critical Research System

## The Problem with Simple Parallel Execution

Simply asking Claude 5 times doesn't improve quality. Without critical evaluation, you get:
- Redundant information
- Shallow analysis
- Inconsistent quality
- No learning from failures

## Axiom MCP's Critical Evaluation System

### Core Philosophy: Parent-Child Quality Control

```
Parent Task: "Research authentication best practices"
├─ Child 1: Returns generic OAuth info (REJECTED - too shallow)
│  └─ Retry: Specific OAuth2 security vulnerabilities and mitigations (ACCEPTED)
├─ Child 2: Copy-pastes outdated SAML docs (REJECTED - outdated)
│  └─ Retry: Current SAML vulnerabilities from 2024-2025 (ACCEPTED)
└─ Child 3: Good analysis of passwordless auth (ACCEPTED)
```

## Real Examples: When Things Go Wrong

### Example 1: Detecting and Rejecting Low-Quality Output

```javascript
// Task: Research quantum computing applications
// Child returns vague, generic content

axiom_mcp_evaluate(
  taskId="child-task-123",
  evaluationType="quality",
  parentExpectations={
    requiredElements: [
      "Specific quantum algorithms",
      "Real-world applications with examples",
      "Current limitations and challenges",
      "2024-2025 developments"
    ],
    qualityThreshold: 0.7,
    rejectIfMissing: ["Real-world applications", "Current limitations"]
  }
)

// Output:
# Task Evaluation: ❌ REJECTED

**Task**: Research quantum computing applications in healthcare
**Score**: 45%

## Issues Found
- ❗ No specific quantum algorithms mentioned
- ❗ Generic statements without concrete examples
- ❗ No mention of current year developments
- ❗ Missing critical analysis of limitations

## Missing Elements
- ❌ Real-world applications with examples
- ❌ Current limitations and challenges
- ❌ Specific quantum algorithms

## Improvement Suggestions
- 💡 Include specific algorithms like VQE, QAOA
- 💡 Cite actual healthcare companies using quantum
- 💡 Discuss hardware limitations (coherence time, error rates)

## Retry Executed
**New Task ID**: retry-456
**Status**: Running

[Second attempt returns detailed analysis of quantum drug discovery at Roche, 
IBM's quantum network for healthcare, specific error rates, etc.]
```

### Example 2: Cascading Evaluation in Deep Trees

```javascript
// 5-level deep research tree with quality gates

axiom_mcp_spawn(
  parentPrompt="Design scalable microservices architecture",
  spawnPattern="recursive",
  spawnCount=3,
  maxDepth=5,
  autoEvaluate=true,
  qualityThreshold=0.75
)

// Level 1: Architecture Overview
//   ├─ Level 2: Service Communication (REJECTED - too theoretical)
//   │   └─ Retry: Specific protocols and patterns (ACCEPTED)
//   │       ├─ Level 3: gRPC implementation (ACCEPTED)
//   │       │   ├─ Level 4: Error handling (REJECTED - incomplete)
//   │       │   │   └─ Retry: Circuit breakers, retries, timeouts (ACCEPTED)
//   │       │   │       └─ Level 5: Monitoring and alerts (ACCEPTED)
```

### Example 3: Cross-Branch Validation

```javascript
// Multiple children research the same topic
// Parent detects contradictions and forces reconciliation

axiom_mcp_merge(
  taskIds=["task-1", "task-2", "task-3"],
  mergeStrategy="compare",
  evaluateConflicts=true
)

// Output:
# Conflict Detection

Branch 1 claims: "PostgreSQL is always faster than MongoDB"
Branch 2 claims: "MongoDB outperforms PostgreSQL for document storage"

## Resolution Required
- Both statements are overly broad
- Context-dependent performance characteristics
- Launching reconciliation task...

[New task spawned to research specific performance benchmarks]
```

## Critical Evaluation Patterns

### 1. Quality Gate Pattern
```javascript
// Define strict quality criteria upfront
axiom_mcp_goals(
  action="define",
  taskId=rootTask.id,
  goalDefinition={
    objective: "Comprehensive security audit",
    successCriteria: [
      "OWASP Top 10 coverage",
      "Code examples for each vulnerability",
      "Mitigation strategies with implementation details",
      "Performance impact analysis"
    ],
    qualityThreshold: 0.8,
    rejectIfMissing: ["Code examples", "Performance impact"]
  }
)
```

### 2. Iterative Refinement Pattern
```javascript
// Keep retrying until quality threshold met
let quality = 0;
let attempts = 0;
const maxAttempts = 5;

while (quality < 0.8 && attempts < maxAttempts) {
  const result = await axiom_mcp_spawn({
    parentPrompt: "Analyze distributed tracing solutions",
    autoEvaluate: true,
    qualityThreshold: 0.8
  });
  
  const evaluation = await axiom_mcp_evaluate({
    taskId: result.taskId,
    evaluationType: "completeness"
  });
  
  quality = evaluation.score;
  attempts++;
  
  if (quality < 0.8) {
    console.log(`Attempt ${attempts}: Score ${quality}. Refining prompt...`);
    // Adjust prompt based on missing elements
  }
}
```

### 3. Comparative Validation Pattern
```javascript
// Spawn multiple approaches, pick the best
const approaches = await axiom_mcp_spawn({
  parentPrompt: "Implement caching strategy",
  spawnPattern: "parallel",
  spawnCount: 5,
  evaluationMode: "competitive"
});

// Each child tries different approach
// Parent evaluates and selects best solution
const winner = await axiom_mcp_evaluate({
  taskIds: approaches.children,
  evaluationType: "comparative",
  criteria: ["Performance", "Complexity", "Maintainability"]
});
```

## Failure Recovery Strategies

### 1. Context Preservation
When a task fails, its context is preserved for the retry:

```javascript
// Original task fails due to missing context
Task: "Optimize database queries"
Output: "Use indexes" (too vague)

// Retry includes failure context
Retry Task: "Previous attempt was too vague. Specifically:
- Analyze the provided slow query log
- Identify missing indexes on JOIN columns
- Calculate index size impact
- Provide CREATE INDEX statements"
```

### 2. Learning from Failures
The system tracks failure patterns:

```javascript
axiom_mcp_status(action="failure_analysis")

// Output:
# Failure Analysis

## Common Failure Patterns
1. **Shallow Research** (45% of failures)
   - Missing concrete examples
   - No recent developments
   - Generic recommendations

2. **Context Loss** (30% of failures)
   - Child tasks losing parent context
   - Misaligned objectives
   - Off-topic responses

3. **Incomplete Analysis** (25% of failures)
   - Missing critical components
   - Partial solutions
   - No error handling
```

### 3. Adaptive Prompting
Based on failure patterns, prompts are automatically enhanced:

```javascript
// After detecting "shallow research" pattern
// System automatically adds to prompts:

"IMPORTANT: Provide specific, concrete examples
- Include code snippets where applicable
- Cite recent sources (2024-2025)
- Avoid generic statements
- Include metrics and benchmarks"
```

## Success Metrics and Goal Achievement

### Hierarchical Success Propagation

```
Root Goal: 90% confidence in authentication system design
├─ SubGoal 1: OAuth2 implementation (85% achieved)
│   ├─ Task 1.1: Security analysis (95% - exceeds requirement)
│   ├─ Task 1.2: Performance testing (75% - acceptable)
│   └─ Task 1.3: Error handling (80% - meets requirement)
├─ SubGoal 2: Session management (70% achieved - WARNING)
│   ├─ Task 2.1: Redis implementation (90% - good)
│   └─ Task 2.2: Scaling strategy (50% - NEEDS RETRY)
└─ SubGoal 3: Audit logging (92% achieved)
```

### Automatic Quality Enforcement

```javascript
// Configure automatic quality gates
axiom_mcp_config({
  autoReject: true,
  minQuality: 0.7,
  maxRetries: 3,
  escalationStrategy: "exponential_backoff",
  failureNotification: true
})

// Any task scoring below 70% is automatically:
// 1. Rejected
// 2. Analyzed for issues
// 3. Retried with enhanced prompt
// 4. Escalated if still failing
```

## Best Practices

1. **Define Clear Success Criteria**
   - Be specific about what constitutes success
   - Include measurable outcomes
   - Set realistic quality thresholds

2. **Use Evaluation Early and Often**
   - Don't wait until the end to evaluate
   - Catch problems early in the tree
   - Fail fast, retry smart

3. **Learn from Patterns**
   - Track what causes failures
   - Adjust prompts based on history
   - Build a knowledge base of what works

4. **Balance Depth and Breadth**
   - Don't go too deep without validation
   - Ensure breadth covers all aspects
   - Use merge operations to synthesize

5. **Monitor Resource Usage**
   - Set reasonable timeouts
   - Limit retry attempts
   - Track cost per quality point

## Conclusion

Axiom MCP isn't just about parallel execution—it's about intelligent, self-improving research that learns from failures and maintains high quality standards throughout the entire tree. The parent-child relationship isn't just organizational; it's a quality control mechanism where parents actively reject subpar work and guide children toward better results.

The system's strength lies not in doing more, but in doing better through critical evaluation and iterative refinement.