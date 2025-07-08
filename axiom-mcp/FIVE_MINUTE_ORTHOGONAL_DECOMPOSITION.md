# 5-Minute Orthogonal Task Decomposition

## Core Principle

Break every task into **5-minute orthogonal chunks** that can execute in parallel without dependencies.

## Why 5 Minutes?

1. **Too short to drift** - No time for research rabbit holes
2. **Forces concrete output** - Must produce something tangible
3. **Easy to interrupt** - Can detect failure quickly
4. **Natural checkpoint** - Clear success/failure boundary
5. **Enables massive parallelism** - 12 parallel tasks = 1 hour of work in 5 minutes

## Orthogonal Decomposition Strategy

### Example: "Build a REST API with authentication"

#### Traditional Approach (Sequential, 60+ minutes):
1. Research authentication methods
2. Design API structure  
3. Implement endpoints
4. Add authentication
5. Write tests
6. Documentation

#### 5-Minute Orthogonal Decomposition:

```typescript
const orthogonalTasks = [
  // Each task is independent and creates a specific file
  {
    id: 'models',
    prompt: 'Create User and Session models in models/user.js and models/session.js. Just the schemas, no dependencies.',
    duration: 5,
    outputs: ['models/user.js', 'models/session.js']
  },
  {
    id: 'auth-logic',
    prompt: 'Create authentication functions in auth/auth.js: hash password, verify password, generate token. Use crypto module only.',
    duration: 5,
    outputs: ['auth/auth.js']
  },
  {
    id: 'routes-structure',
    prompt: 'Create Express route handlers in routes/: auth.js for login/register, users.js for CRUD. Just route structure, mock responses.',
    duration: 5,
    outputs: ['routes/auth.js', 'routes/users.js']
  },
  {
    id: 'middleware',
    prompt: 'Create middleware/auth.js with JWT verification middleware. Standalone file, export one function.',
    duration: 5,
    outputs: ['middleware/auth.js']
  },
  {
    id: 'tests-auth',
    prompt: 'Create tests/auth.test.js testing password hashing and token generation. Use Jest, mock nothing.',
    duration: 5,
    outputs: ['tests/auth.test.js']
  },
  {
    id: 'tests-api',
    prompt: 'Create tests/api.test.js testing route responses. Use supertest, test status codes only.',
    duration: 5,
    outputs: ['tests/api.test.js']
  },
  {
    id: 'config',
    prompt: 'Create config/index.js with all configuration: PORT, JWT_SECRET, DB_URL. Use environment variables.',
    duration: 5,
    outputs: ['config/index.js']
  },
  {
    id: 'main-server',
    prompt: 'Create server.js that starts Express server. Basic setup, no routes connected yet.',
    duration: 5,
    outputs: ['server.js']
  }
];
```

### The Magic: True Orthogonality

Each task:
- **Creates different files** - No conflicts
- **Has no dependencies** - Can run simultaneously  
- **Produces measurable output** - File exists or not
- **Takes exactly 5 minutes** - Interrupt if longer

## Handling Roadblocks: Non-Orthogonal Reserve

When orthogonal tasks hit roadblocks, we have reserves:

```typescript
const nonOrthogonalReserves = [
  {
    id: 'integrate-auth',
    prompt: 'Connect auth middleware to routes. Modify existing files as needed.',
    duration: 5,
    dependencies: ['routes-structure', 'middleware'],
    trigger: 'roadblock'
  },
  {
    id: 'debug-models',
    prompt: 'Fix any issues in models based on test failures.',
    duration: 5,
    dependencies: ['models', 'tests-auth'],
    trigger: 'test-failure'
  },
  {
    id: 'wire-everything',
    prompt: 'Connect all components in server.js. Import and use all routes.',
    duration: 5,
    dependencies: ['main-server', 'routes-structure'],
    trigger: 'integration-needed'
  }
];
```

## Implementation Pattern

```typescript
class OrthogonalExecutor {
  async decomposeTask(mainPrompt: string): Promise<OrthogonalTask[]> {
    // Use Claude to decompose
    const decomposition = await claude.run(`
      Break this task into 5-minute orthogonal chunks:
      "${mainPrompt}"
      
      Rules:
      1. Each chunk creates different files (no conflicts)
      2. Each chunk has no dependencies on others
      3. Each chunk produces measurable output
      4. Each chunk takes exactly 5 minutes
      
      Output format:
      - id: unique identifier
      - prompt: specific 5-minute task
      - outputs: files that will be created
    `);
    
    return parseDecomposition(decomposition);
  }
  
  async executeParallel(tasks: OrthogonalTask[]) {
    const startTime = Date.now();
    
    // Launch all tasks in parallel
    const executions = tasks.map(task => ({
      task,
      promise: this.executeSingleTask(task),
      startTime: Date.now()
    }));
    
    // Monitor progress
    const monitor = setInterval(() => {
      for (const exec of executions) {
        const elapsed = Date.now() - exec.startTime;
        
        if (elapsed > 5 * 60 * 1000 && exec.status !== 'complete') {
          // Interrupt after 5 minutes
          exec.claude.interrupt();
          exec.status = 'timeout';
          
          // Launch reserve task if available
          this.launchReserveTask(exec.task.id);
        }
      }
    }, 10000); // Check every 10 seconds
    
    // Wait for all to complete
    const results = await Promise.allSettled(executions.map(e => e.promise));
    clearInterval(monitor);
    
    return this.assessResults(results);
  }
  
  async executeSingleTask(task: OrthogonalTask) {
    // Create isolated workspace
    const workspace = await this.createWorkspace(task.id);
    
    // Launch Claude
    const claude = spawn('claude', [], { cwd: workspace });
    
    // Send prompt
    await this.sendPrompt(claude, task.prompt);
    
    // Wait for completion (max 5 minutes)
    const result = await this.waitForCompletion(claude, task);
    
    // Verify outputs created
    const success = await this.verifyOutputs(workspace, task.outputs);
    
    return {
      task,
      success,
      files: await this.collectFiles(workspace),
      duration: result.duration
    };
  }
}
```

## MCTS Integration for Roadblocks

When tasks fail or timeout:

```typescript
class MCTSRoadblockHandler {
  async handleRoadblock(failedTask: Task, allTasks: Task[]) {
    // Identify the blocker
    const analysis = await this.analyzeFailure(failedTask);
    
    if (analysis.type === 'missing_dependency') {
      // Find non-orthogonal reserve that can help
      const reserve = this.findReserveTask(analysis.need);
      
      // Execute with higher priority
      return this.executeReserve(reserve);
    }
    
    if (analysis.type === 'approach_failed') {
      // Try different approach using MCTS
      const alternatives = await this.generateAlternatives(failedTask);
      
      // Score alternatives
      const scores = alternatives.map(alt => ({
        approach: alt,
        score: this.scoreApproach(alt, analysis)
      }));
      
      // Pick best alternative
      const best = scores.sort((a, b) => b.score - a.score)[0];
      
      // Execute alternative
      return this.executeAlternative(best.approach);
    }
  }
}
```

## Real-World Example

Task: "Create a blog platform with comments"

### Orthogonal Decomposition:
1. **models/post.js** - Post schema only (5 min)
2. **models/comment.js** - Comment schema only (5 min)  
3. **routes/posts.js** - CRUD endpoints, mock data (5 min)
4. **routes/comments.js** - Comment endpoints, mock data (5 min)
5. **views/post.ejs** - Post display template (5 min)
6. **views/comment.ejs** - Comment display template (5 min)
7. **public/css/blog.css** - Basic styling (5 min)
8. **tests/posts.test.js** - Post route tests (5 min)

### Parallel Execution:
- All 8 tasks launch simultaneously
- Each creates different files (no conflicts)
- Total time: 5 minutes (vs 40 minutes sequential)
- If any fail, reserves activate

### Reserve Tasks (Non-Orthogonal):
- **integrate-db** - Connect models to database
- **wire-routes** - Connect routes to app
- **fix-relationships** - Add model associations
- **debug-tests** - Fix failing tests

## Success Metrics

1. **Parallelism Factor**: 8-12x speedup typical
2. **Success Rate**: 80%+ tasks complete in 5 minutes
3. **Conflict Rate**: <1% with true orthogonality
4. **Recovery Rate**: 95%+ with reserve tasks

## The Key Insight

**Orthogonal decomposition + 5-minute limit + parallel execution = massive speedup**

When you can't parallelize (roadblocks), fall back to targeted non-orthogonal fixes.