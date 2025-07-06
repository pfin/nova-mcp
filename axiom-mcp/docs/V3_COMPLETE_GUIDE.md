# Axiom MCP v3 Complete Guide

## What's New in v3

### 1. **Prompt Customization System**
- Full control over all prompts via JSON configuration
- Environment variable overrides for CI/CD
- A/B testing and performance tracking
- Automatic optimization suggestions

### 2. **Real-Time Intervention**
- Monitor code generation in real-time
- Inject corrections for violations
- Configurable rule engine
- External model feedback integration

### 3. **Parallel Task Execution**
- Run up to 4 tasks simultaneously
- Isolated workspaces prevent conflicts
- Shared event bus for monitoring
- Automatic load balancing

### 4. **No More Timeouts**
- PTY executor prevents 30-second timeout
- Heartbeat mechanism keeps connections alive
- Character-by-character streaming
- Long-running tasks fully supported

## Quick Start

### Installation

```bash
cd /path/to/axiom-mcp
npm install
npm run build:v3
```

### Basic Usage

```bash
# Single task
node dist-v3/src-v3/index.js

# With Gemini CLI
gemini "axiom__axiom_mcp_implement task='Create a Python web scraper'"
```

### Parallel Execution

```bash
# Run the parallel test
node test-parallel-tasks.js

# Or use programmatically
import { MasterController } from './dist-v3/src-v3/core/master-controller.js';

const controller = new MasterController(4); // 4 workers
controller.startNewSearch("Build a complete todo app with API, frontend, and tests");
```

## Prompt Customization

### 1. Create Configuration File

Create `prompt-config.json` in project root:

```json
{
  "systemPrompts": {
    "implementation": "You MUST create actual files using Write/Edit tools..."
  },
  "metaCognitive": {
    "enableByDefault": true
  }
}
```

### 2. Environment Variables

```bash
export AXIOM_PROMPT_SYSTEM_IMPLEMENTATION="Your custom implementation prompt"
export AXIOM_PROMPT_META_ENABLE=true
```

### 3. Test Your Prompts

```javascript
// Create test script
import { promptConfig } from './dist-v3/src-v3/config/prompt-config.js';

const prompt = promptConfig.getCompletePrompt('implementation', 'Create a calculator');
console.log(prompt);
```

### 4. A/B Testing

```javascript
import { createPromptOptimizer } from './dist-v3/src-v3/config/prompt-optimizer.js';

const optimizer = createPromptOptimizer(promptConfig);

// Create variant
const variant = optimizer.createVariant({
  path: "systemPrompts.implementation",
  content: "New experimental prompt",
  hypothesis: "Should improve file creation rate"
});

// Run tests
await optimizer.testSuggestion(variant.id, 20);

// View report
console.log(optimizer.generateReport());
```

## Real-Time Monitoring

### Enable Intervention System

```javascript
const claudeCode = new ClaudeCodeSubprocessV3({
  enableMonitoring: true,
  enableIntervention: true
});
```

### Add Custom Rules

```javascript
import { ruleEngine } from './dist-v3/src-v3/monitors/rule-engine.js';

ruleEngine.addRule({
  id: 'no-deprecated-api',
  name: 'No Deprecated APIs',
  pattern: /localStorage\.|document\.write|with\s*\(/g,
  severity: 'error',
  intervention: 'Use modern alternatives instead',
  autoFix: true
});
```

### Monitor Events

```javascript
executor.on('violation', (event) => {
  console.log(`Violation: ${event.payload.ruleName}`);
});

executor.on('intervention', (event) => {
  console.log(`Intervention: ${event.payload}`);
});
```

## Parallel Task Examples

### Example 1: Multi-Language Project

```javascript
const tasks = [
  { task: "Python backend API", workDir: "./backend" },
  { task: "React frontend", workDir: "./frontend" },
  { task: "Go microservice", workDir: "./service" },
  { task: "PostgreSQL schema", workDir: "./database" }
];

const results = await Promise.all(
  tasks.map(t => axiom.implement(t))
);
```

### Example 2: Test Different Approaches

```javascript
// Test 4 different sorting algorithms
const algorithms = ['quicksort', 'mergesort', 'heapsort', 'timsort'];

const implementations = await Promise.all(
  algorithms.map(algo => 
    axiom.implement({
      task: `Implement ${algo} in Python with tests`,
      workDir: `./${algo}`
    })
  )
);
```

## Advanced Features

### 1. MCTS Configuration

```javascript
// Tune MCTS parameters for your use case
const mctsConfig = {
  explorationConstant: 0.5, // Lower = more exploitation
  minQualityThreshold: 0.8,
  maxDepth: 5,
  maxIterations: 100
};
```

### 2. WebSocket Monitoring

```javascript
// Connect to WebSocket for live updates
const ws = new WebSocket('ws://localhost:8080');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log(`Task ${event.taskId}: ${event.type}`);
});
```

### 3. System Verification

```javascript
// Get proof of implementation
const proof = await systemVerification.gatherProof();
console.log(`Files created: ${proof.filesCreated.length}`);
console.log(`Tests passing: ${proof.testsPass}`);
```

## Performance Optimization

### 1. Prompt Optimization

- Monitor success rates in `prompt-optimization-data/performance.json`
- Review suggestions in `prompt-optimization-data/suggestions.json`
- Test variants with significant sample sizes (>20)

### 2. Parallel Efficiency

- Use isolated working directories
- Minimize shared resource access
- Balance task complexity across workers
- Monitor CPU and memory usage

### 3. Intervention Tuning

- Start with error-level violations only
- Add custom rules gradually
- Monitor false positive rate
- Adjust intervention messages based on effectiveness

## Troubleshooting

### Common Issues

1. **"Implementation Failed" but files exist**
   - Check SystemVerification is running
   - Verify working directory is correct
   - Look for deceptive patterns in output

2. **Parallel tasks interfering**
   - Ensure unique working directories
   - Check for port conflicts
   - Monitor shared resource access

3. **Prompts not updating**
   - Rebuild after changes: `npm run build:v3`
   - Check config file location
   - Verify environment variables

### Debug Mode

```bash
# Enable debug logging
export DEBUG=axiom:*

# Run with verbose output
node dist-v3/src-v3/index.js --verbose
```

### Performance Metrics

```bash
# View performance data
cat prompt-optimization-data/performance.json | jq

# Monitor event stream
tail -f logs-v3/events-*.jsonl | jq
```

## Migration from v1/v2

1. **Update imports**:
   ```javascript
   // Old
   import { ClaudeCodeSubprocess } from './dist/claude-subprocess.js';
   
   // New
   import { ClaudeCodeSubprocessV3 } from './dist-v3/src-v3/claude-subprocess-v3.js';
   ```

2. **Enable new features**:
   ```javascript
   const options = {
     enableMonitoring: true,
     enableIntervention: true,
     eventBus: new EventBus()
   };
   ```

3. **Use prompt config**:
   - Create `prompt-config.json`
   - Migrate custom prompts
   - Test with small tasks first

## Best Practices

1. **Always verify implementations**
   - Run tests after code generation
   - Check file existence
   - Validate output format

2. **Optimize prompts iteratively**
   - Start with defaults
   - Make small changes
   - Measure impact

3. **Use parallel execution wisely**
   - Independent tasks only
   - Monitor resource usage
   - Handle failures gracefully

4. **Configure intervention carefully**
   - Start with critical rules
   - Test intervention messages
   - Monitor effectiveness

## Conclusion

Axiom MCP v3 transforms code generation with:
- Customizable prompts for any use case
- Real-time monitoring and intervention
- Parallel execution for speed
- No more timeout issues
- Built-in optimization tools

The system now truly writes code, not just plans, with safeguards to ensure quality and correctness.