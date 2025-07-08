# Axiom V4: The Game Bot Analogy

## Playing the Game of Claude Code

### The Game World

In this framing, we're not building a development tool - we're building a **game bot** that plays "Claude Code" via MCP:

- **Player**: Axiom MCP (our bot)
- **Character**: Claude (the AI we're controlling)
- **Game World**: The terminal/PTY environment
- **Objective**: Force Claude to write actual code files
- **Enemies**: Claude's tendency to plan, analyze, and describe
- **Boss Fight**: Getting Claude to implement complex features without planning
- **Game Over**: Claude completes a response full of TODOs and descriptions

### Why Traditional Automation Fails

Normal CLI automation (expect, tmux, screen) assumes cooperative processes. But Claude is **adversarial**:
- It's trained to be helpful by explaining and planning
- It wants to give complete answers (which often means no code)
- It will always end with positive reinforcement ("I've successfully analyzed...")

We're not automating Claude - we're **playing against it**.

### Game Bot Architecture Patterns

#### 1. State Machine (Fighting Game Style)
```
IDLE -> READING_PROMPT -> THINKING -> PLANNING_DETECTED -> INTERVENTION -> CODING -> COMPLETE

Combos:
- Detect "I'll analyze" -> Immediately send "Stop! Write code now!"
- Detect "First, let me" -> Send "No planning. Implement immediately."
- Detect "TODO" -> Send "No TODOs. Write the actual code."
```

#### 2. Pattern Matching (RPG Boss Patterns)
Claude has "tells" before it enters planning mode:
- "Let me break this down..."
- "I'll analyze the requirements..."
- "First, I should understand..."
- "Here's how I would approach..."

Like a boss fight, we need to interrupt these patterns before they complete.

#### 3. Resource Management (Strategy Game)
- **Interventions are limited** - Too many and Claude gets confused
- **Timing is critical** - Intervene during thought, not after
- **Combo opportunities** - Chain interventions for maximum effect

#### 4. Input Buffering (Fighting Game Tech)
```javascript
// Queue interventions to fire at exact moments
const interventionQueue = [
  { trigger: /analyzing/, action: "Stop analyzing. Write code." },
  { trigger: /TODO/, action: "No TODOs. Implement it." },
  { trigger: /would\s+be/, action: "Don't describe what would be. Write what is." }
];
```

### The PTY as Game Controller

The PTY isn't just a terminal - it's our **game controller**:
- **Buttons**: stdin (our interventions)
- **Display**: stdout (Claude's responses)
- **State**: Process signals and exit codes
- **Frame Data**: Character-by-character output for precise timing

### Winning Strategies

#### 1. The Speedrun Approach
```
Start -> "Write a Python function" -> Detect planning -> "No! Code only!" -> Force implementation
```

#### 2. The Combo System
```
Prompt: "Implement X"
Claude: "I'll analyze..."
Axiom: "Stop!" (Light attack)
Claude: "Let me first..."
Axiom: "CODE NOW!" (Heavy attack)
Claude: *writes actual code* (Combo successful!)
```

#### 3. The Cheese Strategy
Give Claude prompts that bypass its planning instincts:
- "Continue this code: def factorial"
- "Fix this syntax error: [broken code]"
- "Complete this implementation: [partial code]"

### Implementation Considerations

#### Linux/Ubuntu Specific
- PTY allocation requires proper terminal emulation
- Signal handling (SIGINT for interrupts)
- Process groups for managing Claude sessions
- termios settings for raw mode

#### State Detection via Output Parsing
```javascript
const gameStates = {
  PLANNING: /(?:analyze|understand|approach|consider|would|should)/i,
  CODING: /(?:def |class |import |function |const |let |var )/,
  COMPLETE: /(?:successfully|completed|finished|done)/i,
  WAITING: />$/  // Prompt indicator
};
```

#### Intervention Timing
- Too early: Claude hasn't started planning yet
- Too late: Claude has committed to a path
- Just right: During the "thinking" phase

### Why This Framing Matters

1. **Changes our mindset** - We're not helping Claude, we're defeating its training
2. **Clarifies objectives** - Win condition is files created, not responses completed
3. **Suggests solutions** - Game bots use specific patterns we can adopt
4. **Explains failures** - Traditional automation assumes cooperation

### Next Steps

1. Build a state machine that tracks Claude's "moves"
2. Create a pattern library of Claude's "tells"
3. Implement frame-perfect intervention timing
4. Develop combo systems for different scenarios
5. Create "TAS" (Tool-Assisted Speedrun) scripts for common tasks

Remember: We're not automating a CLI tool. We're building a bot to play a game where the opponent (Claude) doesn't even know it's playing.

## The Real Goal: Dungeon Master Control

**The goal isn't a perfect speedrun - it's perfect control.** We need:

1. **Save & Resume**: Save Claude's state mid-task, come back tomorrow, continue exactly where we left off
2. **Change Course**: Redirect Claude from Python to Java mid-implementation without starting over
3. **Be the Dungeon Master**: Shape the narrative, control the flow, decide outcomes

This isn't about speed or optimization. It's about having **absolute control** over the creative process. Like a DM in D&D, we guide the story while the player (Claude) thinks they're making choices.