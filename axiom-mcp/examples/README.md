# Axiom MCP Examples

This directory contains practical examples demonstrating how to use Axiom MCP to force LLMs to write code instead of planning.

## 🚀 Quick Start Examples

### [basic-file-creation.js](./basic-file-creation.js)
The simplest example - create a single file. Shows how Axiom interrupts planning and forces immediate implementation.

### [interrupt-planning-demo.js](./interrupt-planning-demo.js)
Deliberately triggers planning behavior to demonstrate Axiom's real-time intervention system. See exactly how patterns are detected and interrupted.

### [real-time-monitoring.js](./real-time-monitoring.js)
Shows verbose master mode in action - watch character-by-character output with interventions highlighted.

## 💪 Power User Examples

### [parallel-api-implementations.js](./parallel-api-implementations.js)
Build 3 different API implementations simultaneously. Perfect for exploring different approaches quickly.

### [complex-project-decomposition.js](./complex-project-decomposition.js)
Build an entire e-commerce MVP in 2 hours using orthogonal task decomposition and parallel execution.

### [bug-fixing-workflow.js](./bug-fixing-workflow.js)
Fix bugs without analysis paralysis. Shows both single and parallel debugging approaches.

### [test-driven-development.js](./test-driven-development.js)
Create tests and implementations that actually work, not TODO stubs.

## 🎯 Key Patterns to Remember

1. **Always use `verboseMasterMode: true`** to see what's happening
2. **Use action verbs** (create, implement, build) not analysis words (analyze, research, consider)
3. **Keep tasks to 5-10 minutes** to prevent drift
4. **Leverage parallel execution** for exploring multiple approaches
5. **Files created = success**, no files = failure

## 📊 Expected Results

| Task Type | Without Axiom | With Axiom |
|-----------|---------------|------------|
| Simple script | 5-10 min planning → 0 files | 30s → working file |
| REST API | 30 min research → stubs | 90s → complete API |
| Bug fix | 20 min analysis → maybe fix | 2 min → actual fix |
| Full app | Days of architecture → partial | Hours → working MVP |

## 🔧 Running Examples

These examples assume Axiom MCP is properly configured in your Claude Code settings. To run:

1. Copy the code from any example
2. Paste into Claude Code
3. Watch Axiom force real implementation
4. Check your filesystem for created files

Remember: The only metric that matters is **files created**.