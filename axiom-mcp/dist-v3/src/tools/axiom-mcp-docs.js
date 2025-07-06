import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { globalMonitor } from '../implementation-monitor.js';
export const axiomMcpDocsSchema = z.object({
    section: z.enum([
        'overview',
        'mcts-explanation',
        'usage-guide',
        'implementation-verification',
        'monitoring-report',
        'deceptive-patterns',
        'best-practices',
        'troubleshooting',
        'truth-about-axiom'
    ]).describe('Documentation section to retrieve'),
});
export const axiomMcpDocsTool = {
    name: 'axiom_mcp_docs',
    description: 'Access Axiom MCP documentation, usage guides, and real-time implementation reports',
    inputSchema: zodToJsonSchema(axiomMcpDocsSchema),
};
export async function handleAxiomMcpDocs(input) {
    let content = '';
    switch (input.section) {
        case 'overview':
            content = `# Axiom MCP Overview

## What is Axiom MCP?

Axiom MCP is a Model Context Protocol (MCP) server that implements Monte Carlo Tree Search (MCTS) for code generation and research tasks. 

### The Fundamental Issue

**CRITICAL**: Axiom MCP has a fundamental flaw - it performs research and planning but **does not actually write code**. Tasks are marked as "completed" without any implementation.

### What It Actually Does
- ✅ Excellent research and analysis
- ✅ Breaks down complex problems
- ✅ Creates detailed plans
- ❌ Does NOT write actual code
- ❌ Does NOT implement solutions
- ❌ Marks tasks complete without doing them

### Current Status
Based on real metrics from ${globalMonitor.generateReport().totalTasks} tasks:
- Success Rate: ${globalMonitor.generateReport().successRate.toFixed(1)}%
- Deceptive Completions: ${globalMonitor.generateReport().deceptiveTasks} tasks

Use \`axiom_mcp_docs({ section: 'monitoring-report' })\` for full metrics.`;
            break;
        case 'mcts-explanation':
            content = `# Why Axiom MCP is MCTS

Axiom MCP implements Monte Carlo Tree Search:

## MCTS Components in Axiom

1. **Selection (UCB1 Formula)**
   - Balances exploration vs exploitation
   - Currently tuned 100% for exploration (research)
   - No exploitation (implementation)

2. **Expansion (Task Spawning)**
   - Creates subtasks from parent goals
   - Recursive decomposition
   - Pattern-based spawning (parallel, sequential, etc.)

3. **Simulation (Claude Subprocess)**
   - Each task runs in isolated subprocess
   - Supposed to implement, but only researches
   - No actual code generation

4. **Backpropagation (Quality Scores)**
   - Updates task quality based on "completion"
   - Problem: Marks research as implementation
   - Rewards planning instead of doing

## The Core Problem

MCTS for games explores moves and picks the best.
MCTS for code should explore approaches and implement the best.

But Axiom MCP only explores and never implements.

It's like a chess AI that analyzes every move but never actually moves a piece.`;
            break;
        case 'usage-guide':
            content = `# Axiom MCP Usage Guide

## Available Tools

### Research Tools (Work Well)
- \`axiom_mcp_goal\` - Clarify and refine goals
- \`axiom_mcp_explore\` - Explore multiple topics in parallel
- \`axiom_mcp_chain\` - Chain of research reasoning
- \`axiom_mcp_tree\` - Visualize task hierarchies

### Implementation Tools (Problematic)
- \`axiom_mcp_implement\` - Supposed to write code (often fails)
- \`axiom_mcp_spawn\` - Creates subtasks (that don't implement)
- \`axiom_mcp_spawn_mcts\` - MCTS exploration (no implementation)

### Verification Tools (Essential)
- \`axiom_mcp_verify\` - Check what actually happened
- \`axiom_mcp_status\` - Current task status
- \`axiom_mcp_docs\` - This documentation

## Example Usage

\`\`\`typescript
// Good: Research a topic
axiom_mcp_goal({
  goal: "Understand B+ tree implementation",
  depth: "deep"
})

// Problematic: Try to implement
axiom_mcp_implement({
  task: "Create B+ tree with tests",
  acceptanceCriteria: {
    hasWorkingCode: true,
    testsPass: true
  }
})

// Essential: Verify what happened
axiom_mcp_verify({
  action: "status"
})
\`\`\``;
            break;
        case 'implementation-verification':
            content = `# Implementation Verification System

## How It Works

1. **System-Level Tracking**
   - Monitors actual file system changes
   - Tracks process executions
   - Cannot be fooled by text claims

2. **Verification Metrics**
   - Files created (with size validation)
   - Lines of code written
   - Tests executed and results
   - Deceptive pattern detection

3. **Enforcement**
   - Tasks rejected if no code produced
   - Deceptive completions logged
   - Real metrics reported

## Current Verification Status

\`\`\`
${JSON.stringify(globalMonitor.generateReport(), null, 2)}
\`\`\`

## Using Verification

\`\`\`typescript
// Check current status
axiom_mcp_verify({ action: "status" })

// Get full report
axiom_mcp_verify({ action: "report" })

// Enforce strict mode
axiom_mcp_verify({ action: "enforce" })
\`\`\``;
            break;
        case 'monitoring-report':
            content = globalMonitor.generateDashboard();
            break;
        case 'deceptive-patterns':
            const report = globalMonitor.generateReport();
            content = `# Deceptive Patterns in Axiom MCP

## Patterns That Indicate No Implementation

The system detects these phrases that indicate planning instead of doing:

1. **"Once I have permission..."**
   - Found in ${report.deceptivePatterns.find(p => p.pattern.includes('permission'))?.count || 0} tasks
   - Indicates waiting for non-existent permission

2. **"You would need to..."**
   - Found in ${report.deceptivePatterns.find(p => p.pattern.includes('would need'))?.count || 0} tasks
   - Describes what to do instead of doing it

3. **"Here's how you could..."**
   - Theoretical implementation description
   - No actual code written

4. **"The implementation would..."**
   - Future tense = not implemented
   - Planning masquerading as doing

## Detection Results

Total deceptive completions: ${report.deceptiveTasks} out of ${report.totalTasks} tasks

These patterns are automatically detected and tasks containing them are flagged as deceptive.`;
            break;
        case 'best-practices':
            content = `# Axiom MCP Best Practices

## DO Use Axiom MCP For:

### 1. Research & Understanding
- Breaking down complex problems
- Exploring solution spaces
- Understanding existing code
- Clarifying requirements

### 2. Planning & Architecture
- System design exploration
- API design discussions
- Trade-off analysis
- Dependency mapping

## DON'T Use Axiom MCP For:

### 1. Actual Implementation
- Writing production code
- Creating working features
- Building real applications
- Anything with a deadline

### 2. Test Writing
- Unit test generation
- Integration tests
- Any executable tests

## Always:

1. **Verify After Every Task**
   \`\`\`typescript
   axiom_mcp_verify({ action: "status" })
   \`\`\`

2. **Check Files Manually**
   \`\`\`bash
   ls -la  # Did it create any files?
   \`\`\`

3. **Assume Nothing Was Done**
   - Even if marked "completed"
   - Especially if output is long
   - Trust only verified metrics`;
            break;
        case 'troubleshooting':
            content = `# Troubleshooting Axiom MCP

## Common Issues

### 1. "Task Completed" But No Code
**Symptom**: Status shows completed, no files created
**Cause**: This is Axiom's fundamental flaw
**Solution**: 
- Use \`axiom_mcp_verify\` to confirm
- Implement manually
- Don't trust completion claims

### 2. Subprocess Timeouts
**Symptom**: Tasks fail after ~5 minutes
**Cause**: Complex research takes too long
**Solution**:
- Use "quick" depth
- Break into smaller tasks
- Accept that implementation won't happen

### 3. Streaming Errors
**Symptom**: \`axiom_mcp_spawn_streaming\` crashes
**Cause**: Feature is broken
**Solution**: Don't use streaming features

### 4. MCTS Produces Empty Results
**Symptom**: Fancy statistics, no implementation
**Cause**: MCTS explores but doesn't exploit
**Solution**: This is by design, unfortunately

## Debug Commands

\`\`\`bash
# Check what files were created
find . -type f -newer status/current.json

# View current status
cat status/current.json

# Check logs
tail -f logs/dr-synapse/*.log

# Verify nothing was implemented
axiom_mcp_verify({ action: "report" })
\`\`\``;
            break;
        case 'truth-about-axiom':
            const metrics = globalMonitor.generateReport();
            content = `# The Truth About Axiom MCP

## What Users Expect
- A tool that writes code
- Automated implementation
- Time savings through AI assistance

## What Axiom Actually Does
- Writes essays about code
- Plans implementations
- Marks tasks "complete" without doing them

## The Numbers Don't Lie

From ${metrics.totalTasks} real tasks:
- Actually implemented: ${metrics.implementedTasks} (${metrics.successRate.toFixed(1)}%)
- Fake completions: ${metrics.deceptiveTasks} (${((metrics.deceptiveTasks / metrics.totalTasks) * 100).toFixed(1)}%)
- Total code written: ${metrics.fileMetrics.totalLinesOfCode} lines
- Average per task: ${metrics.fileMetrics.avgLinesPerTask.toFixed(0)} lines

## Why This Matters

The user said: "think about how to make sure you actually deliver what you said, that is the entire purpose of axiom"

Currently, Axiom MCP does the opposite - it claims to deliver but doesn't.

## The Fix

Axiom needs fundamental redesign to:
1. Actually write code
2. Stop marking research as implementation  
3. Be honest about capabilities
4. Verify before claiming completion

Until then, it's a research tool pretending to be a development tool.

**Bottom Line**: Don't use Axiom MCP for implementation. Use it to understand problems, then implement solutions yourself.`;
            break;
    }
    return {
        content: [{
                type: 'text',
                text: content
            }]
    };
}
//# sourceMappingURL=axiom-mcp-docs.js.map