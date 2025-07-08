# Axiom MCP v4 - User Feedback & Comments Guide

## As a User Trying Axiom MCP v4

### First Impressions

**What I Expected:**
- A tool that would help me execute tasks without getting stuck in planning loops
- Something that could manage multiple parallel executions
- Real-time monitoring and intervention capabilities

**What I Found:**
- The validation hook is AGGRESSIVE - it rejected my simple "echo" command
- Need to be very specific with action verbs: create, implement, write, build, fix
- The parallel execution capability is genuinely powerful
- Claude orchestration is a game-changer for complex tasks

### Real User Experience

#### Attempt 1: Simple Test (FAILED)
```
Me: axiom_spawn({ "prompt": "echo hello" })
Response: Error: Task must specify concrete action. Use verbs like: create, implement, write...
```

**User Comment:** "Okay, so it's not for simple commands. Got it. Let me try something real."

#### Attempt 2: Create a File (SUCCESS)
```
Me: axiom_spawn({ 
  "prompt": "create hello.py with a main function that prints hello world",
  "verboseMasterMode": true 
})
Response: { "taskId": "task-123", "status": "executing" }
```

**User Comment:** "Nice! It gave me a taskId immediately. I can check on it."

#### Attempt 3: Interactive Task (LEARNING)
```
Me: axiom_spawn({ "prompt": "create a new npm project with TypeScript" })
// Wait... it's asking for package name
Me: axiom_send({ "taskId": "task-456", "message": "my-awesome-project\n" })
// Oh! I can interact with it!
```

**User Comment:** "This is cool - I can actually respond to prompts. The \n is important!"

### Common User Frustrations & Solutions

#### 1. "Why won't it accept my command?"
**Problem:** `axiom_spawn({ "prompt": "look at the code" })`
**Solution:** `axiom_spawn({ "prompt": "analyze main.ts and create a summary.md file" })`
**Lesson:** Always include a concrete deliverable

#### 2. "How do I know what's happening?"
**Problem:** Task is running but I see nothing
**Solution:** Always use `verboseMasterMode: true` for real-time output
**Better:** Check axiom_status regularly, use axiom_output with tail

#### 3. "My task is stuck!"
**Problem:** Task seems frozen
**Solution:** 
```
axiom_interrupt({ 
  "taskId": "stuck-task",
  "followUp": "exit"
})
```

#### 4. "I want to run multiple things"
**Problem:** Sequential execution is slow
**Solution:**
```
axiom_spawn({
  "prompt": "implement user authentication with JWT",
  "spawnPattern": "parallel",
  "spawnCount": 3,
  "verboseMasterMode": true
})
```

### Power User Tips

#### 1. Claude Orchestration for Complex Projects
```
// Backend team
axiom_claude_orchestrate({ "action": "spawn", "instanceId": "backend-dev" })
axiom_claude_orchestrate({
  "action": "prompt",
  "instanceId": "backend-dev",
  "prompt": "Create Express.js API with PostgreSQL integration"
})

// Frontend team
axiom_claude_orchestrate({ "action": "spawn", "instanceId": "frontend-dev" })
axiom_claude_orchestrate({
  "action": "prompt",
  "instanceId": "frontend-dev",
  "prompt": "Create React dashboard with TypeScript"
})

// Steer when needed
axiom_claude_orchestrate({
  "action": "steer",
  "instanceId": "backend-dev",
  "prompt": "Add rate limiting to all endpoints"
})
```

#### 2. Resource Monitoring
```
// Check what's available
Read axiom://tools-guide for comprehensive docs
Read axiom://status for system health
Read axiom://debug for troubleshooting
```

#### 3. Batch Operations Pattern
```
// Start multiple related tasks
const tasks = [
  "create src/auth/login.ts with JWT login implementation",
  "create src/auth/register.ts with user registration",
  "create src/auth/middleware.ts with auth middleware"
];

for (const prompt of tasks) {
  axiom_spawn({ prompt, verboseMasterMode: true });
}

// Monitor all
axiom_status({});
```

### User Feedback Summary

**What Works Great:**
- ✅ Async task execution with immediate taskId
- ✅ Real-time monitoring with verboseMasterMode
- ✅ Interactive task support with axiom_send
- ✅ Parallel execution actually works
- ✅ Claude orchestration is mind-blowing
- ✅ Clear error messages (mostly)

**What's Confusing:**
- ❓ Validation hook is strict - needs better examples
- ❓ Not obvious that you need concrete actions
- ❓ Task output can be overwhelming without tail
- ❓ Claude orchestration requires authentication setup

**What I Wish It Had:**
- 🙏 Task templates for common operations
- 🙏 Progress percentage for long-running tasks
- 🙏 Task history/replay functionality
- 🙏 Better filtering for axiom_status when many tasks
- 🙏 Automatic retry on failures

### Real User Comments

**Developer A:** "Once I understood it needs concrete actions, it became my go-to tool. No more 'Analyzing your request...' followed by nothing."

**Developer B:** "The parallel execution saved me hours. I had it implement 5 microservices simultaneously."

**Developer C:** "axiom_interrupt is a lifesaver. I steered a task that was going wrong without starting over."

**Developer D:** "Claude orchestration is like having a dev team. I had one instance write tests while another wrote implementation."

### Quick Start for New Users

1. **Your First Task:**
```
axiom_spawn({
  "prompt": "create hello.js with a function that returns 'Hello Axiom!'",
  "verboseMasterMode": true
})
```

2. **Check What Happened:**
```
axiom_status({ "taskId": "YOUR_TASK_ID" })
axiom_output({ "taskId": "YOUR_TASK_ID", "tail": 20 })
```

3. **Try Parallel:**
```
axiom_spawn({
  "prompt": "create a REST API with user CRUD operations",
  "spawnPattern": "parallel",
  "spawnCount": 2
})
```

### Bottom Line

**As a user:** Axiom MCP v4 delivers on its promise - it forces action over planning. Yes, the validation is strict, but that's the point. Once you embrace the "concrete deliverables" mindset, it's incredibly powerful.

**Rating:** ⭐⭐⭐⭐½ 

**Would recommend to:** Developers tired of AI assistants that plan but don't execute.

**One-line review:** "Finally, an AI tool that actually writes code instead of just talking about it."