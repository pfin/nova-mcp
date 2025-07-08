# Claude Code Use Patterns Guide

A comprehensive guide to mastering Claude Code interactive mode, from basic interactions to advanced workflows.

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Basic Interaction Patterns](#basic-interaction-patterns)
3. [Advanced Input Techniques](#advanced-input-techniques)
4. [Vim Mode Mastery](#vim-mode-mastery)
5. [Memory and Context Management](#memory-and-context-management)
6. [Command Workflows](#command-workflows)
7. [Development Patterns](#development-patterns)
8. [Debugging and Troubleshooting](#debugging-and-troubleshooting)
9. [Productivity Tips](#productivity-tips)
10. [Real-World Use Cases](#real-world-use-cases)

## Quick Reference

### Essential Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl+C` | Cancel current operation | During generation or input |
| `Ctrl+D` | Exit Claude Code | Any time |
| `Ctrl+L` | Clear screen | Keep conversation context |
| `↑/↓` | Navigate history | At prompt |
| `Esc Esc` | Edit previous message | After sending |
| `\` + `Enter` | Multiline input | Universal |
| `Option+Enter` | Multiline (macOS) | Terminal default |
| `Shift+Enter` | Multiline | After terminal setup |

### Quick Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `#` | Add to CLAUDE.md | `# Remember to use async patterns` |
| `/vim` | Toggle Vim mode | `/vim` |
| `/clear` | Clear history | `/clear` |
| `/terminal-setup` | Configure shortcuts | `/terminal-setup` |
| `/config` | View/set options | `/config` |

## Basic Interaction Patterns

### 1. Single Line Input
```
claude> What files are in this directory?
```
**Use when**: Quick questions, simple commands, exploratory queries

### 2. Multiline Input
```
claude> I need help with this function:\
> def process_data(items):\
>     # Complex logic here\
> <Enter>
```
**Use when**: Sharing code, complex explanations, structured input

### 3. Canceling Operations
```
claude> [Generating response...]
^C
Operation cancelled
claude>
```
**Use when**: Response taking too long, wrong direction, need to rephrase

### 4. Editing Previous Messages
```
claude> implemnt user authentication
[Claude responds]
claude> <Esc><Esc>
Edit message: implement user authentication
```
**Use when**: Typos, clarifications, adding details

## Advanced Input Techniques

### Pattern 1: Code Block Input
```
claude> Here's my current implementation:\
> ```python\
> class DataProcessor:\
>     def __init__(self):\
>         self.cache = {}\
> ```\
> Can you add error handling?
```

### Pattern 2: Structured Requests
```
claude> I need to:\
> 1. Parse JSON from API\
> 2. Validate required fields\
> 3. Store in PostgreSQL\
> 4. Return success/error response\
> \
> Use async/await patterns throughout
```

### Pattern 3: Context Building
```
claude> Context: We're building a real-time chat app\
> Stack: Node.js, Socket.io, Redis\
> Problem: Messages are duplicating\
> \
> How can we implement idempotency?
```

## Vim Mode Mastery

### Enabling Vim Mode
```
claude> /vim
Vim mode enabled
claude> [NORMAL]
```

### Essential Vim Patterns

#### Navigation
```
[NORMAL] mode:
h/j/k/l - Move left/down/up/right
w/b     - Word forward/backward
0/$     - Line start/end
gg/G    - Document start/end
```

#### Editing
```
i       - Insert mode at cursor
a       - Append after cursor
o       - New line below
O       - New line above
x       - Delete character
dd      - Delete line
yy      - Yank (copy) line
p       - Paste
```

#### Advanced Vim Workflows
```
claude> [NORMAL] /search_term<Enter>
# Find text in your input

claude> [NORMAL] ci"
# Change inside quotes

claude> [NORMAL] V3j
# Visual select 4 lines
```

## Memory and Context Management

### Pattern 1: Project Instructions
```
claude> # This project uses TypeScript strict mode and ESLint
claude> # All async functions must have proper error handling
claude> # Follow repository patterns in src/services/
```

### Pattern 2: Incremental Context
```
claude> Working on the authentication module
[Discussion about auth]

claude> Now let's integrate this with the user service
[Builds on previous context]

claude> # Authentication uses JWT with refresh tokens
[Adds to CLAUDE.md for persistence]
```

### Pattern 3: Context Reset
```
claude> /clear
claude> Starting fresh - let's work on the payment system
```

## Command Workflows

### Development Workflow
```
1. Set project context:
   claude> # Working on e-commerce checkout flow

2. Explore codebase:
   claude> Show me the current payment processing implementation

3. Plan changes:
   claude> What's the best way to add Stripe integration?

4. Implement:
   claude> Implement the Stripe payment handler

5. Review:
   claude> Review this implementation for security issues

6. Test:
   claude> Write comprehensive tests for the payment flow
```

### Debugging Workflow
```
1. Describe issue:
   claude> Users report "payment failed" but logs show success

2. Gather context:
   claude> Show me the payment confirmation logic

3. Analyze:
   claude> What could cause this mismatch?

4. Fix:
   claude> Implement proper error state handling

5. Verify:
   claude> Add logging to track state transitions
```

### Refactoring Workflow
```
1. Identify target:
   claude> The UserService class is too large

2. Analyze:
   claude> What are the main responsibilities?

3. Plan:
   claude> How should we split this into smaller services?

4. Execute:
   claude> Extract authentication logic to AuthService

5. Validate:
   claude> Ensure all tests still pass
```

## Development Patterns

### Pattern 1: Test-Driven Development
```
claude> Write failing tests for user registration:\
> - Email validation\
> - Password strength\
> - Duplicate email check

[Claude writes tests]

claude> Now implement the registration service to pass these tests
```

### Pattern 2: Incremental Building
```
claude> Create a basic Express server
[Initial implementation]

claude> Add middleware for authentication
[Builds on previous]

claude> Implement rate limiting
[Continues building]
```

### Pattern 3: Code Review Style
```
claude> Review this PR:\
> ```diff\
> - const user = await getUser(id)\
> - return user.email\
> + const user = await getUser(id)\
> + return user?.email || null\
> ```\
> Focus on error handling and edge cases
```

## Debugging and Troubleshooting

### Pattern 1: Error Analysis
```
claude> I'm getting this error:\
> ```\
> TypeError: Cannot read property 'map' of undefined\
>   at processItems (utils.js:15:23)\
> ```\
> Here's the function: [paste code]
```

### Pattern 2: Performance Investigation
```
claude> This query takes 5 seconds:\
> ```sql\
> SELECT * FROM orders o\
> JOIN users u ON o.user_id = u.id\
> WHERE o.created_at > '2024-01-01'\
> ```\
> How can I optimize it?
```

### Pattern 3: Systematic Debugging
```
claude> Help me debug this issue systematically:\
> 1. Function works locally but fails in production\
> 2. No error logs\
> 3. Returns empty response\
> \
> Where should I start?
```

## Productivity Tips

### 1. Use Aliases for Common Tasks
```bash
# In your shell config
alias claude-clean='claude -c "Clean up and refactor this code"'
alias claude-test='claude -c "Write comprehensive tests"'
alias claude-review='claude -c "Review for best practices"'
```

### 2. Effective History Usage
```
claude> <Ctrl+R>
(reverse-search): auth
# Find previous authentication discussions
```

### 3. Rapid Prototyping
```
claude> Quick prototype: REST API for todo list with CRUD operations
```

### 4. Learning New Technologies
```
claude> I'm new to Rust. Show me a simple web server with basic routing
```

### 5. Documentation Generation
```
claude> Generate API documentation for these endpoints: [paste routes]
```

## Real-World Use Cases

### Use Case 1: API Development
```
claude> Design RESTful API for a blog platform:\
> - Posts (CRUD, publish/draft)\
> - Comments (nested, moderation)\
> - Users (auth, profiles)\
> - Categories (hierarchical)\
> \
> Include OpenAPI spec
```

### Use Case 2: Bug Investigation
```
claude> Production bug: Memory leak in Node.js app\
> Symptoms: RSS growing 50MB/hour\
> Stack: Express, PostgreSQL, Redis\
> \
> Guide me through investigation
```

### Use Case 3: Architecture Decision
```
claude> We need to add real-time features:\
> Current: REST API, PostgreSQL\
> Requirements: <100ms updates, 10k concurrent users\
> \
> Compare WebSockets vs SSE vs polling
```

### Use Case 4: Code Migration
```
claude> Migrate this JavaScript to TypeScript:\
> [paste code]\
> Add proper types and interfaces
```

### Use Case 5: Performance Optimization
```
claude> This React component re-renders too often:\
> [paste component]\
> How can I optimize it?
```

## Advanced Patterns

### Pattern 1: Iterative Refinement
```
claude> Create user authentication
[Initial implementation]

claude> Add password reset functionality
[Enhances previous]

claude> Implement 2FA with TOTP
[Further enhancement]

claude> Add session management and logout
[Completes feature]
```

### Pattern 2: Exploration Before Implementation
```
claude> What are the tradeoffs between JWT and session-based auth?
[Discusses options]

claude> For our use case (mobile + web), which is better?
[Applies to context]

claude> Implement JWT auth with refresh tokens
[Informed implementation]
```

### Pattern 3: Learning Through Building
```
claude> Explain GraphQL by building a simple server
[Learns while doing]

claude> Add subscriptions for real-time updates
[Deepens understanding]

claude> How does this compare to REST?
[Consolidates learning]
```

## Terminal Configuration Tips

### Optimal Setup
```
claude> /terminal-setup
# Choose option that matches your workflow
```

### Custom Configuration
```
claude> /config
# Review and adjust settings
```

### Environment-Specific Settings
```bash
# Different configs for different projects
cd ~/project1 && claude # Uses project1 history
cd ~/project2 && claude # Uses project2 history
```

## Workflow Integration

### Git Workflow
```
claude> What changed in the last commit?
[Reviews changes]

claude> Write a commit message for these changes
[Generates message]

claude> Create a PR description
[Formats PR]
```

### CI/CD Integration
```
claude> Write GitHub Actions workflow for Node.js testing
[Creates workflow]

claude> Add deployment step to AWS
[Extends workflow]
```

### Documentation Workflow
```
claude> Document this API endpoint:\
> POST /api/users/register\
> [paste implementation]
```

## Best Practices

1. **Start Specific**: Begin with clear, focused requests
2. **Build Context**: Add relevant information progressively
3. **Use Examples**: Show what you want with examples
4. **Iterate**: Refine responses through follow-ups
5. **Save Important Info**: Use `#` to persist key decisions
6. **Clear When Needed**: Use `/clear` for fresh starts
7. **Edit Don't Repeat**: Use `Esc Esc` to fix messages
8. **Cancel Early**: Use `Ctrl+C` if going wrong direction

## Common Pitfalls to Avoid

1. **Overloading Initial Request**: Break complex tasks down
2. **Losing Context**: Use `#` for important information
3. **Not Using Multiline**: Use `\` for code and lists
4. **Forgetting History**: Use arrows and Ctrl+R
5. **Not Canceling**: Don't wait for wrong responses

## User's Custom Commands

Based on real workflow patterns, here are powerful custom commands that encapsulate proven strategies:

### Project Bootstrap Pattern
```
/user:boot
```
**Real Usage**: Start every session with this to quickly understand:
- Current project state
- Recent changes
- Memory context
- Codebase patterns

### Test-Driven Implementation
```
/user:test-coverage
```
**Workflow**:
1. Analyzes current coverage
2. Writes real integration tests
3. Tracks progress systematically
4. Focuses on meaningful tests, not just coverage %

### Production Testing
```
/user:puppeteer-test https://app.vercel.app
```
**Real Value**: Test deployed applications with actual browser automation
- Captures screenshots
- Extracts metrics
- Verifies user stories
- Works on production URLs

### Rapid Implementation
```
/user:ultrastream Create a React dashboard with charts
```
**When to Use**: Need complete, working code without explanation
- Outputs full implementations
- No commentary, just code
- Based on proven patterns

### Pattern Discovery
```
/user:find-pattern useState.*effect
```
**Power User Move**: Search across entire codebase in parallel
- Regex support
- Usage analysis
- Refactoring recommendations

### Systematic Debugging
```
/user:debug-error "TypeError: Cannot read property 'map'"
```
**Process**:
1. Traces error source
2. Checks recent changes
3. Tests fixes incrementally
4. Verifies resolution

### Meta-Cognitive Analysis
```
/user:nova-think Should we use WebSockets or SSE?
```
**Deep Thinking**: Apply Nova's analysis framework
- Breaks down complex problems
- Identifies hidden patterns
- Provides concrete recommendations
- Avoids analysis paralysis

## Power User Patterns from Real Usage

### Pattern: Incremental Building with Verification
```
claude> /user:boot
[Understands project]

claude> Create user authentication module
[Initial implementation]

claude> /user:test-coverage
[Writes tests for auth]

claude> /user:puppeteer-test http://localhost:3000/login
[Verifies in browser]

claude> /user:git-commit
[Clean commit with context]
```

### Pattern: Parallel Exploration
```
claude> I need to add real-time features. What are my options?
[Explores possibilities]

claude> /user:nova-think WebSockets vs SSE vs Polling for our use case
[Deep analysis]

claude> /user:ultrastream WebSocket implementation with reconnection
[Rapid implementation]
```

### Pattern: Debug-First Development
```
claude> /user:debug-error "Connection refused"
[Systematic debugging]

claude> Show me all database connection code
[Investigates]

claude> /user:find-pattern createConnection
[Finds all instances]

claude> /user:refactor-safe database connection handling
[Safe refactoring]
```

### Pattern: API Development Flow
```
claude> /user:api-endpoint POST /api/orders/checkout
[Creates endpoint following patterns]

claude> Add Stripe integration
[Enhances endpoint]

claude> /user:test-coverage
[Ensures thorough testing]

claude> Write OpenAPI documentation
[Documents API]
```

## Advanced Axiom MCP Patterns

### Task Decomposition Strategy
```
claude> Break this feature into 5-10 minute tasks:\
> User dashboard with real-time metrics
```
**Why**: Prevents drift, enables parallelism, creates interrupt windows

### Interrupt-Driven Development
```
claude> [Working on wrong approach...]
^C
claude> Let's try a different approach
```
**Key Insight**: Kill bad processes before they complete with false success

### Observable Execution
```
claude> Show me character-by-character what you're doing
[Real-time visibility into process]
```

### Parallel Verification
```
claude> Test three different implementations:\
> 1. REST polling\
> 2. WebSocket\
> 3. Server-Sent Events
```
**Compare results side-by-side**

## Memory Integration Patterns

### Context Persistence
```
claude> # Project uses TypeScript strict mode
claude> # All APIs must have OpenAPI docs
claude> # Follow Clean Architecture patterns
```
**Result**: Instructions persist across sessions

### Knowledge Building
```
claude> What did we decide about authentication?
[Searches memory]

claude> # Decision: Use JWT with refresh tokens, 15min/7day expiry
[Saves to memory]
```

### Cross-Project Learning
```
claude> How did we handle rate limiting in the last project?
[Retrieves patterns from memory]

claude> Apply that pattern here
[Reuses successful approaches]
```

## Workflow Automation

### Morning Routine
```bash
alias morning='claude -c "/user:boot && git pull && /user:test-coverage"'
```

### Pre-Commit Hook
```bash
claude -c "/user:test-coverage" || exit 1
claude -c "/user:git-commit"
```

### Deployment Verification
```bash
claude -c "/user:puppeteer-test $DEPLOY_URL"
```

## The Axiom Philosophy in Practice

The user's workflow demonstrates key principles:

1. **Execute, Don't Plan**: Every command produces tangible output
2. **Verify Constantly**: Tests, browser checks, real validation
3. **Interrupt Bad Paths**: Don't let wrong approaches complete
4. **Parallelize Exploration**: Try multiple approaches simultaneously
5. **Synthesize Success**: Combine what works, discard what doesn't

## Conclusion

Claude Code's interactive mode is designed for fluid, iterative development. Master these patterns to:
- Work faster with better shortcuts
- Maintain context across sessions
- Build complex solutions incrementally
- Debug effectively
- Integrate smoothly into your workflow

The user's custom commands and patterns show that effective Claude Code usage combines:
- **Rapid execution** with `/user:ultrastream`
- **Systematic verification** with `/user:test-coverage`
- **Deep analysis** with `/user:nova-think`
- **Real-world testing** with `/user:puppeteer-test`

Remember: The key to effective Claude Code usage is thinking in conversations, not commands. Build context, iterate on solutions, and use the interactive features to maintain a smooth workflow. Most importantly, don't just plan - execute, verify, and iterate.