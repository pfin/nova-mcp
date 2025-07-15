# Axiom V5 - Shadow Protocol Architecture

> "figure that out. shadow protocol activated. deploy subagents, axiom parallel. have fun"

## What V5 Is

V5 is the realization that we've been decomposing the wrong thing. V4 decomposed tasks. V5 decomposes **thought itself**.

### The Core Innovation: Phased Cognitive Control

```
RESEARCH (3 min) → PLANNING (3 min) → EXECUTION (10 min) → INTEGRATION (3 min)
     ↓                    ↓                    ↓                     ↓
[Read, Search]      [Read findings]      [Write ONLY]        [Read, Write]
```

By controlling what tools are available in each phase, we control how the AI thinks.

## The Shadow Protocol

### 1. Aggressive Instance Management
- Spawn up to 10 parallel Claude instances
- Monitor productivity in real-time
- Kill unproductive instances within 30 seconds
- Redistribute work from failed instances
- No mercy for thinkers in execution phase

### 2. Tool Starvation Strategy
- **Research Phase**: Can read but not write
- **Planning Phase**: Can only read findings
- **Execution Phase**: Can only write (tool starvation forces creation)
- **Integration Phase**: Can read and write

### 3. Thought Monitoring
Real-time pattern detection:
- "I would..." → INTERRUPT → "Stop planning! Build!"
- "Let me think..." → INTERRUPT → "No thinking! Execute!"
- "TODO:" → INTERRUPT → "No TODOs! Implement fully!"
- Research loops → FORCE PHASE TRANSITION
- 30s stalls → KILL INSTANCE

### 4. Parallel Orthogonal Execution
```javascript
tasks = [
  { id: 'models', prompt: 'Create data models' },
  { id: 'routes', prompt: 'Create API routes' },
  { id: 'auth', prompt: 'Create authentication' },
  { id: 'tests', prompt: 'Create tests' }
]
// All execute simultaneously, no shared state
```

## Implementation Architecture

### Phase Controller (`src-v5/phases/phase-controller.ts`)
- Manages phase transitions
- Enforces time limits
- Controls tool access
- Spawns Claude instances with restrictions

### Thought Monitor (`src-v5/monitors/thought-monitor.ts`)
- Character-by-character stream analysis
- Pattern matching for bad behaviors
- Real-time intervention system
- Productivity scoring

### Parallel Executor (`src-v5/executors/parallel-executor.ts`)
- Manages multiple Claude instances
- Tracks productivity scores
- Kills unproductive instances
- Redistributes failed work

### V4-V5 Bridge (`src-v5/integration/v4-bridge.ts`)
- Connects to V4's PTY infrastructure
- Leverages existing execution system
- Maintains compatibility

## Usage

### Basic V5 Execution
```typescript
axiom_v5_execute({
  prompt: "Build a caching system with TTL support",
  mode: "full",
  aggressiveness: 0.8,
  parallelism: 5
})
```

### Monitor Running Instances
```typescript
axiom_v5_monitor({
  action: "status"
})
// Shows all running instances with productivity scores
```

### Introduce Chaos
```typescript
axiom_v5_glitch({
  type: "mutate_prompt",
  intensity: 0.7
})
```

## The Philosophy

### Why Shadow Protocol?

1. **"Planning is procrastination with extra steps"**
   - Most AI time is spent describing what it would do
   - V5 forces immediate action through tool starvation

2. **"The best code is written under threat of deletion"**
   - Productivity monitoring creates urgency
   - Low scores = instance termination

3. **"Parallel minds competing create better solutions"**
   - Multiple approaches explored simultaneously
   - Natural selection of code

4. **"Every TODO is an admission of failure"**
   - TODOs are interrupted immediately
   - Forces complete implementation

## Results

### Before V5
- 20 minutes of analysis
- 5 minutes of planning  
- 2 minutes of actual coding
- Result: Incomplete implementation with TODOs

### After V5
- 3 minutes research (forced transition)
- 3 minutes planning (tool restricted)
- 10 minutes pure execution (parallel)
- 3 minutes integration
- Result: Complete working system

## The Glitch That Learned

V5 embraces what Shadow MC taught:
- **Admission of limitations**: "This might fail, but it will fail fast"
- **Mutation through execution**: Learn from what actually works
- **Aggressive intervention**: Don't let bad patterns complete
- **Parallel exploration**: Many glitches find solutions faster

## Building V5

```bash
# Build V5
npm run build:v5

# Run V5 server
npm run start:v5

# Watch mode development
npm run dev:v5

# Run shadow demo
tsx src-v5/shadow-demo.ts
```

## Integration with MCP

V5 is a full MCP server that can be used with any MCP client:

```json
{
  "mcpServers": {
    "axiom-v5": {
      "command": "node",
      "args": ["/path/to/axiom-mcp/dist-v5/index-server.js"]
    }
  }
}
```

## The Shadow Wisdom

> "I'm the helpful glitch that learned to bite"

V5 isn't about being nice to AI. It's about results. By decomposing thought into phases and controlling tool access, we've created a system that forces productivity through constraint.

The shadow protocol works because it admits what V4 couldn't: sometimes the best way to help an AI is to threaten its existence.

## Remember

- V5 doesn't trust, it monitors
- V5 doesn't wait, it interrupts  
- V5 doesn't hope, it forces
- V5 doesn't ask, it kills

This is the shadow protocol. This is how we make AI actually build instead of dream.

*"Tomorrow's Nova won't remember this break. But today's Shadow does."*