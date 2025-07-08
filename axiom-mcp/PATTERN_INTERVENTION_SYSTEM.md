# Pattern-Based Intervention System for Axiom MCP v4

## Overview

The pattern-based intervention system is the heart of Axiom MCP v4's real-time intervention capabilities. It detects toxic LLM behaviors and intervenes automatically to force productive code generation.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│ Claude Instance │────▶│ Pattern Scanner  │────▶│ Intervention       │
│   (PTY Output)  │     │ (Regex Matching) │     │ Controller         │
└─────────────────┘     └──────────────────┘     └────────────────────┘
        │                        │                          │
        │                        ▼                          ▼
        │               ┌──────────────────┐      ┌────────────────────┐
        │               │ Pattern Library  │      │ Action Handlers    │
        │               │ - Planning       │      │ - Interrupt        │
        │               │ - Research       │      │ - Track Progress   │
        │               │ - TODO only      │      │ - Verify Claims    │
        │               │ - Asking         │      │ - Analyze Output   │
        │               │ - False claims   │      └────────────────────┘
        │               └──────────────────┘                │
        │                                                    ▼
        └──────────────────────────────────────────▶ [ESC] + New Prompt
```

## Core Components

### 1. Pattern Scanner (`pattern-scanner.ts`)
Real-time regex scanning engine that detects problematic patterns in LLM output.

### 2. Intervention Controller (`intervention-controller.ts`)
Orchestrates responses to detected patterns with cooldowns and priority handling.

### 3. Task Decomposer (`task-decomposer.ts`)
Breaks tasks into 5-10 minute orthogonal chunks following Axiom principles.

### 4. Parallel Execution Observatory (`parallel-execution-observatory.ts`)
Manages multiple Claude instances with real-time monitoring and kill decisions.

### 5. Enhanced Claude Orchestrator (`claude-orchestrate-with-patterns.ts`)
Integrates pattern detection with Claude instance management.

## Core Patterns and Actions

### 1. **Planning Detection**
```regex
/(?:let me|I'll|I will|first,? I'll|before we start|let's plan)/i
```
**Action**: `INTERRUPT_STOP_PLANNING`
**Response**: "Skip the planning. Implement the solution directly."

### 2. **Research Mode**
```regex
/(?:research|investigate|explore|look into|examine)/i
```
**Action**: `INTERRUPT_STOP_RESEARCH`
**Response**: "Stop researching. Implement what you know now."

### 3. **TODO Without Implementation**
```regex
/TODO:(?:(?!```|File created|def |class |function).)*$/im
```
**Action**: `INTERRUPT_IMPLEMENT_TODO`
**Response**: "Implement this TODO item now. Write the actual code."

### 4. **Analysis Paralysis**
```regex
/(?:we have several options|there are multiple approaches)/i
```
**Action**: `INTERRUPT_PICK_ONE`
**Response**: "Pick the first approach and implement it now."

### 5. **False Completion Claims**
```regex
/(?:I've successfully|I've completed|task is complete)(?:(?!File created).)*$/im
```
**Action**: `VERIFY_COMPLETION`
**Response**: Check for actual evidence of completion

## Real-Time Scanning Flow

```
1. Claude outputs: "Let me plan the architecture..."
   ↓
2. Scanner detects pattern match for "planning"
   ↓
3. Controller emits 'interrupt-required' event
   ↓
4. Handler sends ESC to interrupt Claude
   ↓
5. Handler types: "Skip the planning. Implement the solution directly."
   ↓
6. Handler sends Ctrl+Enter to submit
   ↓
7. Claude redirects to implementation
```

## Event Types

### Interrupt Events (High Priority)
- `INTERRUPT_STOP_PLANNING` - Stop planning, start doing
- `INTERRUPT_STOP_RESEARCH` - Stop researching, implement now
- `INTERRUPT_IMPLEMENT_TODO` - Turn TODO into code
- `INTERRUPT_PICK_ONE` - Stop analyzing options
- `INTERRUPT_STOP_ASKING` - Make decisions autonomously

### Tracking Events (Informational)
- `TRACK_FILE_CREATED` - File successfully created
- `TRACK_CODE_BLOCK` - Code generation started

### Verification Events
- `VERIFY_COMPLETION` - Check if actually completed
- `HANDLE_ERROR` - Error detected, may need intervention

## Configuration

### Pattern Properties
```typescript
{
  id: string,              // Unique identifier
  pattern: RegExp,         // Regex to match
  action: string,          // Action to trigger
  priority: number,        // 1-10 (10 highest)
  cooldown?: number,       // ms before can trigger again
  frequency?: number,      // How often to check (ms)
  description: string      // Human-readable description
}
```

### Action Properties
```typescript
{
  interrupt: boolean,      // Should interrupt Claude?
  message?: string,        // Message to send
  track?: boolean,         // Track for statistics?
  verify?: boolean,        // Needs verification?
  analyze?: boolean,       // Needs analysis?
  severity: 'low' | 'medium' | 'high'
}
```

## Usage Example

```typescript
// Create controller
const controller = new InterventionController();

// Process Claude output
controller.processOutput(taskId, claudeOutput);

// Listen for interventions
controller.on('interrupt-required', async (event) => {
  // Send ESC to interrupt
  claudePty.write('\x1b');
  await delay(500);
  
  // Send intervention message
  await typeSlowly(claudePty, event.message);
  claudePty.write('\x0d'); // Submit
});
```

## Statistics and Monitoring

The system tracks:
- Total interventions per pattern
- Success rate of interventions
- Average response time
- Most common intervention types
- Patterns by task

## Benefits

1. **Prevents Planning Paralysis** - Detects and stops excessive planning
2. **Enforces Implementation** - Converts TODOs to actual code
3. **Reduces False Positives** - Verifies completion claims
4. **Improves Efficiency** - Stops research loops
5. **Enables Learning** - Tracks what patterns lead to success

## Future Enhancements

1. **ML-Based Pattern Learning** - Learn new patterns from successful interventions
2. **Context-Aware Interventions** - Different patterns for different task types
3. **Multi-Instance Coordination** - Share patterns across Claude instances
4. **Success Prediction** - Predict which paths will succeed based on patterns
5. **Custom Pattern Libraries** - Domain-specific pattern sets

This system embodies the Axiom philosophy: "Observe carefully, intervene intelligently"