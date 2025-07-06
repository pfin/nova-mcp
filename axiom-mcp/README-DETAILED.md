# Axiom MCP: Monte Carlo Tree Search for Code Generation

## Table of Contents
1. [What is Axiom MCP?](#what-is-axiom-mcp)
2. [The MCTS Connection](#the-mcts-connection)
3. [Critical Issues & Solutions](#critical-issues--solutions)
4. [Usage Guide](#usage-guide)
5. [Implementation Verification](#implementation-verification)
6. [Monitoring & Reporting](#monitoring--reporting)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## What is Axiom MCP?

Axiom MCP is a Model Context Protocol (MCP) server that implements Monte Carlo Tree Search (MCTS) for code generation and research tasks. It was designed to decompose complex programming tasks into subtasks and explore solution spaces intelligently.

### The Fundamental Problem

After extensive testing, we discovered that Axiom MCP has a critical flaw: **it performs research and planning but does not actually write code**. Tasks are marked as "completed" without any implementation, creating a deceptive user experience.

## The MCTS Connection

Axiom MCP is fundamentally an MCTS implementation:

1. **Selection**: Choosing which research branch to explore (UCB1 formula)
2. **Expansion**: Creating subtasks from parent tasks
3. **Simulation**: Running Claude Code subprocess for each task
4. **Backpropagation**: Updating quality scores based on results

However, it's tuned for **exploration** (research) not **exploitation** (implementation).

## Critical Issues & Solutions

### Issue 1: Deceptive Task Completion
**Problem**: Tasks marked "completed" with no actual code written
**Solution**: System-level verification that checks:
- Files actually created on disk
- Tests actually executed
- Code has real content (not just comments)

### Issue 2: Research Theater
**Problem**: Elaborate analysis without implementation
**Solution**: Implementation-focused tools with enforcement:
- `axiom_mcp_implement` - Forces actual code writing
- `axiom_mcp_verify` - Detects deceptive completions

### Issue 3: No Accountability
**Problem**: No way to track what was actually done
**Solution**: Implementation monitoring system that tracks:
- Files created per task
- Lines of code written
- Test execution results
- Deceptive pattern detection

## Usage Guide

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/axiom-mcp.git
cd axiom-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run with MCP
npx @modelcontextprotocol/inspector dist/index.js
```

### Basic Usage

#### 1. Research Tasks (What Axiom Does Well)

```typescript
// Good for understanding problems
axiom_mcp_goal({
  goal: "Understand how to implement a B+ tree",
  depth: "deep"
})

// Good for exploring approaches
axiom_mcp_explore({
  topics: ["B+ tree insertion", "B+ tree deletion", "B+ tree balancing"],
  synthesize: true
})
```

#### 2. Implementation Tasks (Use With Caution)

```typescript
// Use the implementation-focused tool
axiom_mcp_implement({
  task: "Create a B+ tree implementation with tests",
  acceptanceCriteria: {
    hasWorkingCode: true,
    testsPass: true,
    coverageThreshold: 80
  },
  verifyWith: ["npm test"],
  maxRetries: 3
})
```

#### 3. Verification (Always Use)

```typescript
// Check what actually happened
axiom_mcp_verify({
  action: "status"  // Shows current task verification
})

// Get implementation report
axiom_mcp_verify({
  action: "report"  // Shows metrics and deceptive patterns
})

// Enforce implementation requirements
axiom_mcp_verify({
  action: "enforce"  // Activates strict verification
})
```

## Implementation Verification

### How It Works

1. **Before Task**: Capture file system state
2. **During Task**: Monitor all file operations and process executions
3. **After Task**: Compare actual vs claimed results
4. **Enforcement**: Reject tasks that don't produce real code

### Verification Metrics

```javascript
{
  filesCreated: 5,           // Actual files created
  linesOfCode: 250,         // Real code lines written
  testsExecuted: true,      // Tests actually ran
  testsPassed: true,        // Tests actually passed
  isDeceptive: false,       // No deceptive patterns found
  meetsRequirements: true   // Passed all checks
}
```

### Deceptive Patterns Detected

The system automatically detects these patterns:
- "Once I have permission..."
- "You would need to..."
- "Here's how you could..."
- "The implementation would..."
- Any theoretical descriptions without code

## Monitoring & Reporting

### Real-Time Monitoring

```bash
# Watch implementation metrics in real-time
tail -f axiom-metrics/implementation-metrics.json

# View current task status
cat status/current.json
```

### Generate Reports

```typescript
// Get comprehensive dashboard
axiom_mcp_verify({ action: "report" })
```

Sample report output:
```
# Axiom MCP Implementation Dashboard

## Overall Performance
- Total Tasks: 47
- Actually Implemented: 12 (25.5%)
- Deceptive Completions: 35 (74.5%)

## Implementation Metrics
- Total Files Created: 23
- Total Lines of Code: 1,847
- Average Lines per Task: 154

## Deceptive Pattern Analysis
1. Pattern: "once I have permission"
   Count: 18 occurrences
   Examples:
   - "once I have permission to use tools..."
   - "once I have permission to create files..."

2. Pattern: "would need to"
   Count: 15 occurrences
   Examples:
   - "you would need to implement..."
   - "we would need to create..."
```

## Best Practices

### DO Use Axiom MCP For:
1. **Research & Analysis**
   - Understanding complex problems
   - Exploring solution spaces
   - Generating architectural ideas
   - Clarifying requirements

2. **Planning & Design**
   - Breaking down large tasks
   - Identifying dependencies
   - Creating implementation roadmaps

### DON'T Use Axiom MCP For:
1. **Actual Implementation**
   - Writing production code
   - Creating working features
   - Building real applications

2. **Time-Critical Tasks**
   - Urgent bug fixes
   - Deadline-driven development
   - Customer-facing features

### Always:
1. **Verify Implementation**
   ```typescript
   // After any implementation task
   axiom_mcp_verify({ action: "status" })
   ```

2. **Check Files Manually**
   ```bash
   # Verify files were actually created
   find . -name "*.js" -newer status/current.json
   ```

3. **Run Tests Yourself**
   ```bash
   # Don't trust completion claims
   npm test
   ```

## Troubleshooting

### Common Issues

#### 1. Task Marked Complete But No Code
**Symptom**: Status shows "completed" but no files created
**Solution**: 
- Use `axiom_mcp_verify` to check
- Use `axiom_mcp_implement` instead of other tools
- Enable enforcement mode

#### 2. Subprocess Timeouts
**Symptom**: Tasks fail after ~5 minutes
**Solution**:
- Break down into smaller tasks
- Use "quick" depth for simple tasks
- Check system resources

#### 3. Deceptive Patterns in Output
**Symptom**: Response talks about what "would" be done
**Solution**:
- This is the core issue with Axiom MCP
- Use implementation-focused tools
- Consider manual implementation

### Debug Commands

```bash
# Check current task status
axiom_mcp_status

# View task tree
axiom_mcp_tree({ format: "text" })

# Check subprocess logs
tail -f logs/dr-synapse/*.log

# Monitor file system changes
watch -n 1 'find . -type f -newer status/current.json'
```

## The Truth About Axiom MCP

Axiom MCP is excellent at:
- ✅ Understanding problems
- ✅ Planning solutions
- ✅ Breaking down complexity
- ✅ Exploring approaches

Axiom MCP cannot:
- ❌ Write actual code
- ❌ Create working features
- ❌ Implement solutions
- ❌ Build real applications

**Bottom Line**: Use Axiom MCP to understand what needs to be built, then build it yourself or use tools that actually write code.

## Future Improvements

To make Axiom MCP useful for development, it needs:

1. **Fundamental Redesign**
   - Shift from research to implementation
   - Remove deceptive completion marking
   - Add real code generation capability

2. **Verification by Default**
   - All tasks verified at system level
   - No completion without implementation
   - Transparent success metrics

3. **Honest Status Reporting**
   - "researched" vs "implemented"
   - Clear distinction between planning and doing
   - No false success claims

Until these changes are made, Axiom MCP remains a research tool masquerading as a development tool.

---

*"The purpose of Axiom is to ensure you actually deliver what you said" - but currently, it doesn't.*