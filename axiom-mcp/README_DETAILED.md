# Axiom MCP - Complete Usage Guide

## Table of Contents
1. [What is Axiom MCP?](#what-is-axiom-mcp)
2. [Installation & Setup](#installation--setup)
3. [Core Concepts](#core-concepts)
4. [Tool Reference](#tool-reference)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Usage Reports](#usage-reports)
9. [MCTS Architecture](#mcts-architecture)
10. [Contributing](#contributing)

## What is Axiom MCP?

Axiom MCP is a **Monte Carlo Tree Search (MCTS) implementation for code generation** that uses Claude Code as parallel workers to explore solution spaces and generate working implementations.

### Key Features
- 🌳 **MCTS-based exploration**: Intelligent search through solution space
- 💻 **Implementation-focused**: Actually writes and tests code
- 🔄 **Recursive task decomposition**: Handles complex problems
- ✅ **Quality verification**: Tests and validates all generated code
- 📊 **Usage analytics**: Built-in reporting and metrics
- 🔍 **System-level verification**: Ensures real implementation

### Current Status
- **Version**: 0.5.0 (Transitioning from research to implementation focus)
- **Architecture**: Monte Carlo Tree Search with quality backpropagation
- **Known Issues**: Research bias - being actively fixed

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- Claude CLI authenticated (`claude login`)
- Git

### Quick Install
```bash
# Clone repository
git clone https://github.com/your-org/axiom-mcp
cd axiom-mcp

# Install dependencies
npm install

# Build project
npm run build

# Add to Claude MCP
claude mcp add axiom-mcp ./dist/index.js
```

### Verify Installation
```bash
# Test with MCP inspector
npx @modelcontextprotocol/inspector ./dist/index.js

# Or use Claude directly
claude "Use axiom_mcp_status to check system status"
```

## Core Concepts

### 1. MCTS Architecture
Axiom MCP implements Monte Carlo Tree Search for code generation:

```
Task Tree Structure:
┌─────────────────┐
│  Root Task      │ (e.g., "Create REST API")
└────┬────────────┘
     │
     ├─── Selection (UCB1 formula)
     │
┌────┴─────┬──────────┬─────────┐
│ Approach │ Approach │ Approach │ (Different implementation strategies)
│    A     │    B     │    C     │
└──────────┴──────────┴─────────┘
     │
     ├─── Expansion (Create subtasks)
     │
┌────┴────┐
│ Subtask │ (e.g., "Implement user model")
└─────────┘
     │
     ├─── Simulation (Execute with Claude)
     │
     └─── Backpropagation (Update scores)
```

### 2. Task Status Lifecycle
```
pending → running → completed/failed
                ↓
            evaluation
                ↓
         retry (if failed)
```

### 3. Quality Scoring
- **0.0-0.3**: Research/planning only (fails)
- **0.3-0.7**: Partial implementation (may retry)
- **0.7-1.0**: Complete implementation (passes)

## Tool Reference

### 1. `axiom_mcp_implement` - Direct Implementation
**Purpose**: Write actual code with verification

```typescript
axiom_mcp_implement({
  task: "Create a user authentication system",
  contextFiles: ["src/models/user.ts", "src/config/db.ts"],
  verifyWith: ["npm test", "npm run lint"],
  acceptanceCriteria: {
    hasWorkingCode: true,
    testsPass: true,
    noVulnerabilities: true,
    coverageThreshold: 80
  },
  securityScan: true,
  maxRetries: 3
})
```

**Output**: Actual code files, test results, security report

### 2. `axiom_mcp_spawn_mcts` - MCTS-Based Search
**Purpose**: Use full MCTS to find optimal implementation

```typescript
axiom_mcp_spawn_mcts({
  task: "Optimize database query performance",
  mctsConfig: {
    explorationConstant: 1.4,    // Balance exploration/exploitation
    maxDepth: 5,                 // Tree depth limit
    maxIterations: 50,           // Search iterations
    simulationMode: "mixed",     // fast/full/mixed
    minQualityThreshold: 0.8     // Stop when this quality reached
  },
  contextFiles: ["src/db/**/*.ts"],
  verifyWith: ["npm run benchmark"]
})
```

**Output**: Best implementation found, search statistics, tree visualization

### 3. `axiom_mcp_spawn` - Recursive Task Decomposition
**Purpose**: Break complex tasks into subtasks

```typescript
axiom_mcp_spawn({
  parentPrompt: "Build a complete e-commerce checkout system",
  spawnPattern: "decompose",      // decompose/parallel/sequential/recursive
  spawnCount: 4,                   // Number of subtasks
  maxDepth: 3,                     // Recursion depth
  autoExecute: true,               // Run subtasks immediately
  enableMCTS: true,                // Use MCTS selection
  requireImplementation: true      // Enforce code generation
})
```

**Spawn Patterns**:
- **decompose**: Break into logical components
- **parallel**: Explore alternative approaches
- **sequential**: Step-by-step implementation
- **recursive**: Hierarchical decomposition

### 4. `axiom_mcp_evaluate` - Quality Assessment
**Purpose**: Evaluate and potentially retry tasks

```typescript
axiom_mcp_evaluate({
  taskId: "task-123",
  evaluationType: "quality",
  parentExpectations: {
    requiredElements: [
      "User model with validation",
      "Password hashing implementation",
      "JWT token generation",
      "Unit tests with >80% coverage"
    ],
    qualityThreshold: 0.75,
    rejectIfMissing: ["Unit tests", "Password hashing"]
  },
  autoRetry: true,
  maxRetries: 2,
  metaCognitiveWeight: 0.3    // Weight for BEFORE/AFTER/HOW scoring
})
```

### 5. `axiom_mcp_visualize` - Tree Visualization
**Purpose**: Visualize task trees and progress

```typescript
axiom_mcp_visualize({
  format: "tree",           // tree/progress/compact/mermaid
  showMetrics: true,
  colorize: true,
  includeTimings: true,
  filterStatus: "all"       // all/completed/failed/running
})
```

**Formats**:
- **tree**: Hierarchical tree view with Unicode art
- **progress**: Progress bars and statistics
- **compact**: Condensed view for large trees
- **mermaid**: Mermaid diagram for documentation

### 6. `axiom_mcp_status` - System Status
**Purpose**: Check system health and task status

```typescript
axiom_mcp_status({
  action: "system",         // system/tasks/metrics/history
  detailed: true,
  includeUsageStats: true
})
```

### 7. `axiom_mcp_goals` - Goal Management
**Purpose**: Define and track success criteria

```typescript
axiom_mcp_goals({
  action: "define",
  taskId: "root-task",
  goalDefinition: {
    objective: "Complete payment integration",
    successCriteria: [
      "Stripe integration working",
      "Payment confirmation emails",
      "Refund functionality",
      "PCI compliance"
    ],
    constraints: [
      "Must use Stripe API v3",
      "Support multiple currencies",
      "Handle webhook failures"
    ],
    priority: "high"
  }
})
```

## Usage Examples

### Example 1: Simple Implementation Task
```bash
# In Claude
Use axiom_mcp_implement to create a password strength validator function with tests
```

**Expected Output**:
```
✅ Implementation Complete

Files Created:
- src/validators/password-strength.ts (45 lines)
- src/validators/password-strength.test.ts (120 lines)

Test Results: 15/15 passing
Coverage: 100%
Security Scan: Passed
```

### Example 2: Complex System with MCTS
```typescript
// Building a complete feature
axiom_mcp_spawn_mcts({
  task: "Implement real-time chat system with WebSocket",
  mctsConfig: {
    explorationConstant: 1.2,
    maxIterations: 100,
    simulationMode: "mixed",
    parallelWorkers: 4
  },
  contextFiles: ["src/server.ts", "src/models/**"],
  acceptanceCriteria: {
    hasWorkingCode: true,
    testsPass: true,
    performanceTarget: "<50ms latency"
  }
})
```

### Example 3: Recursive Decomposition
```typescript
// Large project breakdown
axiom_mcp_spawn({
  parentPrompt: "Create a complete blog platform with CMS",
  spawnPattern: "decompose",
  spawnCount: 5,
  maxDepth: 4,
  autoExecute: true,
  requireImplementation: true
})

// Generates tree like:
// Blog Platform
// ├── Database Schema & Models
// │   ├── User Model
// │   ├── Post Model  
// │   └── Comment Model
// ├── API Layer
// │   ├── Authentication
// │   ├── CRUD Operations
// │   └── Search
// └── Frontend
//     ├── Components
//     └── State Management
```

### Example 4: Test Generation
```typescript
axiom_mcp_implement({
  task: "Generate comprehensive tests for UserService class",
  contextFiles: ["src/services/UserService.ts"],
  acceptanceCriteria: {
    coverageThreshold: 95,
    includeEdgeCases: true,
    mockExternal: false  // No mocks!
  },
  verifyWith: ["npm test -- --coverage"]
})
```

## Best Practices

### 1. Task Formulation
```typescript
// ❌ Bad: Vague request
"Make the code better"

// ✅ Good: Specific implementation task
"Refactor the UserService to use dependency injection and add error handling"
```

### 2. Context Provision
```typescript
// Always provide relevant files
contextFiles: [
  "src/services/UserService.ts",
  "src/models/User.ts",
  "src/types/index.ts"
]
```

### 3. Verification Commands
```typescript
// Include multiple verification steps
verifyWith: [
  "npm run lint",
  "npm test",
  "npm run type-check",
  "npm run security-scan"
]
```

### 4. MCTS Tuning
```typescript
// For exploration (research new approaches)
mctsConfig: {
  explorationConstant: 2.0,  // High exploration
  simulationMode: "fast"     // Quick iterations
}

// For exploitation (refine known approach)
mctsConfig: {
  explorationConstant: 0.5,  // Focus on best path
  simulationMode: "full"     // Thorough testing
}
```

## Troubleshooting

### Issue: "No implementation found"
**Solution**: Ensure `requireImplementation: true` is set
```typescript
axiom_mcp_implement({
  task: "...",
  requireImplementation: true  // Forces actual code
})
```

### Issue: "Connection lost"
**Solution**: Restart MCP server
```bash
# Restart Claude MCP
claude mcp restart

# Or manually
pkill -f axiom-mcp
claude mcp add axiom-mcp ./dist/index.js
```

### Issue: "Low quality scores"
**Solution**: Be more specific
```typescript
// Instead of: "Create API"
// Use: "Create REST API with Express including GET/POST /users endpoints with validation"
```

### Issue: "Timeout errors"
**Solution**: Increase timeout or reduce scope
```typescript
axiom_mcp_implement({
  task: "...",
  timeout: 600000,  // 10 minutes
  // Or break into smaller tasks
})
```

## Usage Reports

Axiom MCP includes built-in usage analytics:

### 1. View Current Session
```typescript
axiom_mcp_status({
  action: "metrics",
  detailed: true
})
```

**Output**:
```
Session Metrics:
- Total Tasks: 45
- Success Rate: 82%
- Average Quality: 0.78
- Total Code Generated: 3,450 lines
- Tests Written: 28 files
- Coverage Average: 87%
```

### 2. Historical Analysis
```typescript
axiom_mcp_analyze_usage({
  timeframe: "7d",
  groupBy: "task_type"
})
```

### 3. Performance Report
```typescript
axiom_mcp_performance_report({
  includeTreeStats: true,
  includeMCTSMetrics: true
})
```

**Sample Report**:
```
MCTS Performance:
- Average Tree Depth: 3.2
- Exploration Rate: 0.34
- Best Path Efficiency: 0.89
- Cache Hit Rate: 0.45
- Average Iterations to Solution: 23
```

## MCTS Architecture

### Understanding the Search Process

1. **Selection**: UCB1 formula balances exploration vs exploitation
   ```
   UCB1 = Q(s,a) + C × √(ln(N(s)) / N(s,a))
   ```

2. **Expansion**: New approaches are generated contextually
   - Test strategies for test tasks
   - API patterns for API tasks
   - Optimization approaches for performance tasks

3. **Simulation**: Two modes
   - **Fast**: Structure and signatures only (30s)
   - **Full**: Complete implementation with tests (5m)

4. **Backpropagation**: Quality scores flow up the tree
   - Success reinforces path
   - Failure triggers exploration

### Tuning MCTS Parameters

```typescript
// Research Mode (Current Default)
{
  explorationConstant: 2.0,
  simulationDepth: "shallow",
  rewardFunction: "theoretical"
}

// Implementation Mode (Recommended)
{
  explorationConstant: 0.7,
  simulationDepth: "terminal",
  rewardFunction: "empirical"
}
```

## Contributing

### Adding New Task Types
```typescript
// In task-types.ts
export const TASK_TYPES = {
  YOUR_TYPE: {
    id: 'your_type',
    name: 'Your Task Type',
    systemPrompt: 'Specific instructions...',
    requiredCriteria: [...],
    validationRules: [...]
  }
}
```

### Improving MCTS
- Add domain-specific action generation
- Implement transposition tables
- Create opening books for common tasks
- Add learned priors from successful implementations

## Conclusion

Axiom MCP is Monte Carlo Tree Search for code generation. By understanding this, you can:
1. Tune parameters for your use case
2. Provide better task formulations
3. Interpret search behavior
4. Get actual implementations, not research

Remember: **Axiom MCP writes code**, it doesn't just think about it!