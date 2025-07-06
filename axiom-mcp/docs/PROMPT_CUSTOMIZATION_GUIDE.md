# Axiom MCP v3 Prompt Customization Guide

## Overview

Axiom MCP v3 now supports comprehensive prompt customization, allowing you to modify system prompts, task-specific prompts, and intervention messages to optimize performance for your specific use cases.

## Configuration Methods

### 1. JSON Configuration File

The primary method is through `prompt-config.json` in the project root:

```json
{
  "systemPrompts": {
    "implementation": "Your custom implementation prompt here"
  }
}
```

### 2. Environment Variables

Override specific prompts using environment variables:

```bash
# Override system prompts
export AXIOM_PROMPT_SYSTEM_IMPLEMENTATION="You must write actual code files..."
export AXIOM_PROMPT_SYSTEM_RESEARCH="Analyze thoroughly with examples..."

# Override task prompts
export AXIOM_PROMPT_TASK_IMPLEMENTATION_PREFIX="Create working code for:"

# Enable/disable meta-cognitive wrapping
export AXIOM_PROMPT_META_ENABLE=true
```

### 3. Runtime API

Modify prompts programmatically:

```javascript
// In your code
import { promptConfig } from './src-v3/config/prompt-config.js';

// Update a specific prompt
promptConfig.updateConfig({
  systemPrompts: {
    implementation: "New implementation prompt"
  }
});

// Get current configuration
const config = promptConfig.exportConfig();
```

## Prompt Structure

### System Prompts

These set the overall behavior for different task types:

- **research**: For analysis and research tasks
- **implementation**: For code generation tasks
- **analysis**: For code review and analysis
- **verification**: For testing and validation
- **decomposition**: For breaking down complex tasks

### Task Prompts

These provide task-specific guidance:

```json
{
  "taskPrompts": {
    "implementation": {
      "prefix": "What to do",
      "requirements": "Quality standards",
      "constraints": "Limitations",
      "verification": "How to verify"
    }
  }
}
```

### Meta-Cognitive Templates

These add reasoning structure:

```json
{
  "metaCognitive": {
    "beforeTemplate": "BEFORE: I will {action}",
    "afterTemplate": "AFTER: I will {action}",
    "howTemplate": "APPROACH: {method}",
    "enableByDefault": true
  }
}
```

## Optimization Strategies

### A/B Testing Prompts

Create variants to test performance:

```javascript
import { createPromptOptimizer } from './src-v3/config/prompt-optimizer.js';

const optimizer = createPromptOptimizer(promptConfig);

// Create a variant
const variant = optimizer.createVariant({
  path: "systemPrompts.implementation",
  content: "Experimental prompt focusing on test-first development",
  hypothesis: "TDD approach will improve test pass rates",
  author: "your-name"
});

// Test the variant
await optimizer.testSuggestion(variant.id, 10); // Run 10 trials
```

### Submit Improvement Suggestions

```javascript
const suggestion = optimizer.submitSuggestion({
  targetPath: "systemPrompts.implementation",
  suggestedPrompt: "Your improved prompt here",
  rationale: "This should reduce hallucination of file creation",
  expectedMetric: "hasImplementation",
  expectedImprovement: 25 // 25% improvement expected
});
```

### Performance Tracking

The system automatically tracks:
- Success rate (files created, tests pass)
- Average MCTS reward
- Execution time
- Verification scores

View performance report:
```javascript
const report = optimizer.generateReport();
console.log(report);
```

## Parallel Task Execution

### Configuration for 4 Simultaneous Tasks

The default configuration supports 4 parallel tasks:

```json
{
  "parallelization": {
    "maxConcurrentTasks": 4,
    "taskIsolation": "Ensure each task uses separate directories",
    "coordinationPrompt": "Parallel execution guidelines"
  }
}
```

### Example: Running 4 Different Tasks

```javascript
// Task 1: Web API
const task1 = "Create a REST API with Express.js for user management";

// Task 2: Data Processing
const task2 = "Implement a CSV parser with data validation in Python";

// Task 3: Frontend Component
const task3 = "Build a React component for file upload with progress";

// Task 4: Algorithm Implementation
const task4 = "Implement quicksort with comprehensive unit tests in Java";

// Execute all simultaneously
const results = await Promise.all([
  axiomMcp.implement({ task: task1, workDir: "./api" }),
  axiomMcp.implement({ task: task2, workDir: "./parser" }),
  axiomMcp.implement({ task: task3, workDir: "./frontend" }),
  axiomMcp.implement({ task: task4, workDir: "./algorithms" })
]);
```

## Best Practices

### 1. Implementation Prompts

Key elements for successful implementation:
```
- Explicit instruction to use Write/Edit tools
- Emphasis on creating actual files
- Clear success criteria
- Verification requirements
```

### 2. Avoiding Research Mode

Common pitfalls to avoid:
```
- "You would implement..." language
- "The approach would be..." phrasing
- Missing tool usage instructions
- Vague success criteria
```

### 3. Intervention Messages

Effective intervention prompts:
```
- Clear identification of the issue
- Specific corrective action
- Prevention of further progress until fixed
- Educational explanation
```

## Testing Your Prompts

### Quick Test Script

```bash
# Test a single prompt modification
node -e "
import { promptConfig } from './dist-v3/src-v3/config/prompt-config.js';
promptConfig.updateConfig({
  systemPrompts: {
    implementation: 'YOUR_TEST_PROMPT_HERE'
  }
});
console.log('Prompt updated');
"

# Run a test task
gemini "axiom__axiom_mcp_implement task='Create hello.py that prints Hello World'"

# Check if it worked
python hello.py
```

### Monitoring Prompt Performance

Watch the event logs to see how prompts affect behavior:
```bash
tail -f axiom-mcp/logs-v3/events-*.jsonl | grep -E "(hasImplementation|testsPass|deceptivePatterns)"
```

## Advanced Customization

### Custom Tool Prompts

Add prompts for specific tools:
```json
{
  "toolPrompts": {
    "your_custom_tool": {
      "description": "What this tool does",
      "systemPrompt": "Specific behavior for this tool",
      "userPromptTemplate": "Template with {placeholders}"
    }
  }
}
```

### Conditional Prompts

Use the API for dynamic prompt selection:
```javascript
const taskComplexity = analyzeComplexity(userTask);
const prompt = taskComplexity > 8 
  ? config.systemPrompts.implementation + " Take extra care with complex logic."
  : config.systemPrompts.implementation;
```

## Troubleshooting

### Prompts Not Taking Effect

1. Check configuration file location
2. Verify environment variables
3. Rebuild after changes: `npm run build:v3`
4. Check logs for prompt loading messages

### Poor Performance

1. Review performance metrics
2. Compare with baseline prompts
3. Test smaller variations
4. Use A/B testing framework

### Conflicts Between Tasks

1. Ensure proper task isolation
2. Use separate working directories
3. Avoid shared file dependencies
4. Monitor resource usage

## Contributing Prompt Improvements

Share successful prompts with the community:

1. Test thoroughly (min 20 trials)
2. Document performance improvements
3. Include rationale and context
4. Submit via GitHub PR

Your optimized prompts help improve Axiom MCP for everyone!