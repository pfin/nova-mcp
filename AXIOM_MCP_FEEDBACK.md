# Axiom MCP Tool Feedback Report

## Executive Summary

The Axiom MCP (Model Context Protocol) tool has a **fundamental execution problem**: it only performs research and planning, but **does not actually write code or execute tasks**. When asked to "create unit tests without mocks," it provides excellent analysis but never writes a single line of test code. This makes it unsuitable for actual software development tasks in its current form.

## Table of Contents
1. [Overview](#overview)
2. [What Works Well](#what-works-well)
3. [Issues Encountered](#issues-encountered)
4. [Detailed Feature Analysis](#detailed-feature-analysis)
5. [Suggestions for Improvement](#suggestions-for-improvement)
6. [Additional Testing Results](#additional-testing-results)
7. [Use Case Scenarios](#use-case-scenarios)
8. [Recommendations](#recommendations)

## Overview

Axiom MCP appears to be designed as an intelligent research assistant that can:
- Decompose complex goals into actionable subtasks
- Execute parallel research branches
- Maintain context across research sessions
- Provide structured analysis and synthesis

### Testing Context
- **Primary Task**: Creating unit tests for a financial library without mocks
- **Environment**: Node.js/TypeScript project with WebAssembly components
- **Complexity**: High (automatic differentiation, yield curves, financial instruments)

## What Works Well

### 1. Goal Clarification (`axiom_mcp_goal`)
**Rating: ⭐⭐⭐⭐⭐**

The goal clarification feature is exceptional:
- **Intelligent Decomposition**: Breaks vague requests into specific, measurable objectives
- **Clarifying Questions**: Asks the right questions to refine scope
- **Success Criteria**: Clearly defines what "done" looks like
- **Context Awareness**: Understands technical domain and constraints

**Example Output Quality:**
```markdown
## Success Criteria
- 100% replacement of mocks with actual implementations
- Verifiable accuracy against known financial benchmarks
- Automatic differentiation validation showing correct derivatives
- Memory safety with no leaks in WASM bindings
```

### 2. Status Monitoring (`axiom_mcp_status`)
**Rating: ⭐⭐⭐⭐**

Clean, informative status reporting:
- Task summaries with states (pending/running/completed/failed)
- System resource usage
- Historical command tracking
- Clear timestamp information

### 3. Conceptual Framework
**Rating: ⭐⭐⭐⭐**

The goal-oriented research approach is well-designed:
- Breadth-first vs depth-first strategies
- Automatic subtask generation
- Context preservation across sessions
- Hierarchical task organization

## Issues Encountered

### 1. Subprocess Execution Failures
**Severity: Critical**

All parallel research branches consistently fail:
```
⚠️ Error: Process error: Command failed: claude -p --allowedTools...
*Duration: 307s*
```

**Problems:**
- Hard timeout at ~5 minutes (307 seconds)
- No intermediate output or progress indication
- Generic error messages provide no debugging context
- Cannot determine what the subprocess was attempting

### 2. Limited Error Diagnostics
**Severity: High**

When failures occur:
- No stack traces or detailed error logs
- No indication of subprocess state at failure
- No partial results are preserved
- Cannot retry or resume failed branches

### 3. Resource Constraints
**Severity: Medium**

- Memory usage not tracked or limited
- No way to control concurrent subprocess count
- Cannot prioritize certain branches
- No backpressure mechanism

### 4. Integration Limitations
**Severity: Medium**

- Cannot pass file contents directly to subprocesses
- Binary data handling unclear (important for WASM)
- No structured data exchange protocol
- Limited tool access in subprocesses

## Detailed Feature Analysis

### Chain of Goal Research (`axiom_mcp_chain`)
**Rating: ⭐⭐⭐**

**Strengths:**
- Good hierarchical decomposition
- Maintains research context
- Supports different traversal strategies

**Weaknesses:**
- Often produces only theoretical analysis
- Lacks concrete implementation generation
- No verification of generated content
- Limited depth control (maxDepth parameter seems ignored)

### Parallel Exploration (`axiom_mcp_explore`)
**Rating: ⭐⭐**

**Strengths:**
- Conceptually powerful for parallel research
- Good topic organization
- Synthesis option for combining results

**Weaknesses:**
- Consistent subprocess failures
- No partial results on failure
- Cannot monitor progress
- Synthesis rarely works due to branch failures

### Task Tree Visualization (`axiom_mcp_tree`)
**Rating: ⭐⭐⭐⭐**

**Strengths:**
- Multiple output formats (text, mermaid, JSON)
- Clear hierarchy visualization
- Good for understanding task structure

**Weaknesses:**
- Only works with completed tasks
- No real-time updates
- Limited filtering options

## Suggestions for Improvement

### 1. Streaming Output and Progress Monitoring

```typescript
interface StreamingOptions {
  onProgress: (taskId: string, progress: Progress) => void;
  onOutput: (taskId: string, chunk: string) => void;
  onError: (taskId: string, error: Error) => void;
  bufferSize?: number;
}

axiom_mcp_explore_streaming({
  topics: ['topic1', 'topic2'],
  streaming: {
    onProgress: (taskId, progress) => {
      console.log(`Task ${taskId}: ${progress.percent}% complete`);
    },
    onOutput: (taskId, chunk) => {
      console.log(`[${taskId}] ${chunk}`);
    }
  }
});
```

### 2. Configurable Execution Parameters

```typescript
interface ExecutionConfig {
  timeout?: number;           // Custom timeout in ms
  maxConcurrent?: number;     // Limit parallel execution
  retryPolicy?: RetryPolicy;  // Automatic retry configuration
  savePartialResults?: boolean;
  resumable?: boolean;
}

axiom_mcp_chain({
  goal: 'Complex research task',
  execution: {
    timeout: 900000,        // 15 minutes
    maxConcurrent: 2,       // Only 2 parallel branches
    savePartialResults: true,
    retryPolicy: {
      maxAttempts: 3,
      backoff: 'exponential'
    }
  }
});
```

### 3. Enhanced Error Handling and Recovery

```typescript
interface ErrorContext {
  taskId: string;
  timestamp: Date;
  lastOutput: string;
  stackTrace: string;
  systemState: SystemState;
  recoveryOptions: RecoveryOption[];
}

// Allow error interception and recovery
axiom_mcp_set_error_handler((error: ErrorContext) => {
  if (error.recoveryOptions.includes('RESUME')) {
    return { action: 'RESUME', fromCheckpoint: error.lastCheckpoint };
  }
  return { action: 'FAIL' };
});
```

### 4. File Context Sharing

```typescript
interface FileContext {
  path: string;
  content: string;
  language: string;
  metadata?: Record<string, any>;
}

axiom_mcp_explore_with_context({
  topics: ['unit test generation'],
  fileContext: [
    { path: 'src/dual.ts', content: dualSource, language: 'typescript' },
    { path: 'src/curves.ts', content: curveSource, language: 'typescript' }
  ],
  sharedTools: ['Read', 'Write', 'Edit'] // Tools available to subprocesses
});
```

### 5. Task Templates and Patterns

```typescript
enum TaskTemplate {
  UnitTestGeneration = 'unit_test_generation',
  CodeRefactoring = 'code_refactoring',
  Documentation = 'documentation',
  BugInvestigation = 'bug_investigation'
}

axiom_mcp_from_template({
  template: TaskTemplate.UnitTestGeneration,
  parameters: {
    sourceFiles: ['src/**/*.ts'],
    testFramework: 'jest',
    coverageTarget: 90,
    mockingAllowed: false
  }
});
```

### 6. Checkpoint and Resume System

```typescript
// Save progress periodically
const session = await axiom_mcp_chain({
  goal: 'Complex multi-hour task',
  checkpointing: {
    interval: 300000,  // Every 5 minutes
    storage: 'local'   // or 'cloud'
  }
});

// Resume from checkpoint
axiom_mcp_resume(session.id, {
  fromCheckpoint: 'latest',
  skipCompleted: true
});
```

### 7. Real-time Collaboration Features

```typescript
// Allow multiple agents to work on same goal
axiom_mcp_collaborate({
  sessionId: 'shared-session-123',
  role: 'reviewer',  // or 'implementer', 'tester'
  notifications: {
    onTaskComplete: true,
    onError: true,
    onMilestone: true
  }
});
```

## Additional Testing Results

### Test Case 2: Performance Analysis Task

I tested the tool with a performance optimization analysis task:

**Goal**: "Analyze the architecture of the Axiom WASM financial library to identify potential performance bottlenecks"

**Results**:
- `axiom_mcp_goal` performed excellently again, providing targeted clarifying questions
- The analysis framework was well-structured with clear success criteria
- However, no actual code analysis or profiling was performed

### Test Case 3: Spawn Pattern Testing

**Test**: Using `axiom_mcp_spawn` with parallel pattern

```typescript
axiom_mcp_spawn({
  parentPrompt: "Analyze the Dual number implementation...",
  spawnPattern: "parallel",
  spawnCount: 3,
  maxDepth: 2
})
```

**Result**: 
- Failed with "Failed to parse subtasks from response"
- The tree visualization shows the task failed after 61.5 seconds
- No error details or partial results available

### Key Observations

1. **Consistent Subprocess Issues**: Every attempt at parallel execution fails
2. **No Concrete Outputs**: Even successful operations only provide analysis, not implementation
3. **Timeout Sensitivity**: Tasks seem to fail around the 1-minute mark consistently
4. **Poor Error Messages**: "Failed to parse subtasks" doesn't help debugging

## Use Case Scenarios

### Scenario 1: Code Generation (Poor Fit)
**Task**: Generate unit tests without mocks
**Experience**: 
- Good problem decomposition
- Failed execution on all parallel branches
- No actual code generated
- Would need manual implementation anyway

**Rating**: ⭐⭐ (Not suitable for code generation tasks)

### Scenario 2: Architecture Analysis (Good Fit)
**Task**: Analyze performance bottlenecks
**Experience**:
- Excellent clarifying questions
- Good framework for analysis
- Clear success criteria
- Missing actual profiling execution

**Rating**: ⭐⭐⭐⭐ (Good for planning, needs execution layer)

### Scenario 3: Research Synthesis (Unknown)
**Task**: Combine multiple research sources
**Experience**:
- Unable to test due to subprocess failures
- Synthesis feature never successfully executed
- Concept seems powerful if it worked

**Rating**: ❓ (Cannot evaluate due to technical issues)

## Recommendations

### Immediate Fixes (Priority 1)
1. **Fix Subprocess Execution**
   - Debug why all parallel branches timeout
   - Add intermediate progress logging
   - Implement partial result recovery

2. **Improve Error Messages**
   - Include subprocess stdout/stderr
   - Add context about what was being attempted
   - Provide actionable debugging steps

3. **Add Execution Timeout Configuration**
   - Allow users to set custom timeouts
   - Different timeouts for different task types
   - Warn when approaching timeout

### Medium-term Improvements (Priority 2)

1. **Streaming Output**
   ```typescript
   // Real-time progress visibility
   axiom_mcp_streaming.on('output', (taskId, line) => {
     console.log(`[${taskId}] ${line}`);
   });
   ```

2. **Task Persistence**
   ```typescript
   // Save and resume complex research
   const checkpoint = await axiom_mcp_save_state();
   // ... later ...
   await axiom_mcp_restore_state(checkpoint);
   ```

3. **Better Integration**
   - Direct file passing to subprocesses
   - Structured data exchange
   - Tool whitelist/blacklist configuration

### Long-term Enhancements (Priority 3)

1. **Execution Strategies**
   ```typescript
   axiom_mcp_execute({
     strategy: 'distributed',  // or 'local', 'cloud'
     resources: {
       cpu: 4,
       memory: '8GB',
       timeout: '30m'
     }
   });
   ```

2. **Template Library**
   - Pre-built templates for common tasks
   - Community-contributed patterns
   - Domain-specific optimizations

3. **Monitoring Dashboard**
   - Real-time task progress
   - Resource usage graphs
   - Historical performance metrics

## Critical Issue: No Code Generation

The most fundamental problem with Axiom MCP is that **it doesn't actually do the work**. 

### What Should Happen vs What Actually Happens

**Expected Workflow:**
```
User: "Create unit tests for the Dual class without mocks"
Axiom: 
1. Analyzes the Dual class implementation
2. Writes comprehensive test file
3. Runs the tests to verify they work
4. Fixes any failures
5. Returns working test code
```

**Actual Workflow:**
```
User: "Create unit tests for the Dual class without mocks"
Axiom: 
1. Provides clarifying questions about testing approach
2. Creates a theoretical framework for testing
3. Discusses best practices
4. Explains what good tests would look like
5. Never writes a single line of code
```

### Concrete Examples:

1. **Asked**: "Create unit tests without mocks"
   - **Got**: Research about what makes good tests
   - **Missing**: Actual test code

2. **Asked**: "Analyze Dual number implementation for performance"
   - **Got**: Questions about performance requirements
   - **Missing**: Actual performance analysis or profiling

3. **Used**: `axiom_mcp_chain` for goal-oriented research
   - **Got**: Theoretical framework and planning
   - **Missing**: Implementation of any kind

**This is not a bug - it appears to be by design**. The tool seems built for research and planning only, not execution.

## Conclusion

The Axiom MCP tool is **fundamentally misaligned** with software engineering needs. When developers ask for "unit tests," they need actual test code that runs, not a research paper about testing best practices.

### Current State: Not Fit for Purpose
- **What it does**: Research, planning, analysis
- **What we need**: Code generation, test writing, implementation
- **Gap**: 100% - it does zero actual implementation

### Critical Recommendation
Axiom MCP needs to be redesigned from the ground up to:
1. **Write actual code** based on the research
2. **Execute and verify** that code works
3. **Iterate until success** rather than just planning

Without this fundamental shift from "research tool" to "implementation tool," Axiom MCP has no practical value for software development tasks.

### Overall Rating: ⭐ (1/5)
*A research tool marketed as a development tool - completely misses the mark*

## What Axiom MCP Needs to Be Useful

### Minimum Viable Features
1. **Code Writing**: Actually generate code files, not just talk about them
2. **Code Execution**: Run the code to verify it works
3. **Error Handling**: When code fails, fix it and try again
4. **Iterative Development**: Keep working until the goal is achieved
5. **File Operations**: Create, read, edit actual files in the project

### Example of What Success Looks Like
```typescript
// User request: "Create unit tests for Dual class"

// Axiom should:
// 1. Read dual.ts to understand the implementation
// 2. Create dual.test.ts with actual test code
// 3. Run: npm test dual.test.ts
// 4. If tests fail, debug and fix
// 5. Return: "Created dual.test.ts with 25 passing tests, 
//    achieving 100% coverage. No mocks used."

// NOT: "Here's how you could approach writing tests..."
```

### The Fundamental Misunderstanding
Axiom MCP seems designed for **research assistants** who need to understand problems deeply. Software engineers need **implementation assistants** who can write working code. These are completely different use cases requiring different tools.