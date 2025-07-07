# Axiom MCP v3: Observability and Intervention System

## Overview

The Axiom MCP observability system isn't just about watching - it's about **actively guiding execution** to ensure compliance with universal principles and successful implementation.

## Core Concept: Observation → Intervention → Success

```
Traditional Approach:          Axiom MCP Approach:
Execute → Hope it works       Execute → Observe → Intervene → Verify → Success
```

## Architecture

### 1. Database Layer (SQLite)

```sql
conversations     - Parent-child task relationships
actions          - Significant events (file_created, errors, etc.)
streams          - Raw output with parsed events
observation_views - Saved query filters
```

### 2. Stream Parser

Parses PTY output character-by-character to detect:
- File creation/modification
- Command execution
- Error occurrences
- TODO/FIXME violations
- Planning language ("I would...", "I will...")
- Code blocks

### 3. Rule Verifier

Real-time verification of universal principles:
- **No TODOs**: Implement immediately
- **No Planning**: Write code, not descriptions
- **Files Required**: Must create actual files
- **No Mocks**: Real execution only

### 4. Intervention System

When violations are detected:
1. Stream parser identifies violation
2. Rule verifier confirms severity
3. Intervention injected into stream
4. Execution guided to compliance
5. Success verified by file existence

## Universal Principles

### Coding Principles
1. **No Mocks Ever** - Real data, real execution
2. **Real Execution Only** - No simulations or dry runs
3. **Verify Don't Trust** - Check every operation
4. **No TODOs** - Implement fully or not at all
5. **Observable Operations** - Log everything

### Thinking Principles
1. **Action Over Planning** - Implement first
2. **Fail Fast and Loudly** - Clear errors immediately
3. **Concrete Over Abstract** - Solve real problems
4. **Measure Don't Guess** - Base decisions on data
5. **Explicit Over Implicit** - Make intentions clear

## Tools

### axiom_mcp_observe

View active conversations and execution history:

```typescript
// View all active conversations
axiom_mcp_observe({ mode: "all" })

// View specific conversation tree
axiom_mcp_observe({ mode: "tree", conversationId: "..." })

// View recent actions across all conversations
axiom_mcp_observe({ mode: "recent", limit: 20 })
```

### axiom_mcp_principles

Manage and enforce universal principles:

```typescript
// List all principles
axiom_mcp_principles({ action: "list" })

// Check code for violations
axiom_mcp_principles({ 
  action: "check", 
  code: "// TODO: implement later" 
})

// Verify conversation compliance
axiom_mcp_principles({ 
  action: "verify", 
  conversationId: "..." 
})
```

### axiom_mcp_demo

Demonstrate the system in action:

```typescript
// Show violations → interventions → success
axiom_mcp_demo({ scenario: "violations" })

// Show clean execution
axiom_mcp_demo({ scenario: "clean" })

// Step-by-step intervention example
axiom_mcp_demo({ scenario: "intervention" })
```

## Real-World Example

### Scenario: User writes code with violations

**Step 1: Initial Attempt**
```javascript
// User starts writing
I would implement a factorial function that calculates...
```

**Step 2: Violation Detected**
```
[STREAM PARSER] Detected planning language: "I would implement"
[RULE VERIFIER] Violation: action-over-planning
[INTERVENTION] Planning detected! Stop describing and start implementing!
```

**Step 3: User adds TODO**
```javascript
function factorial(n) {
  // TODO: implement calculation
  return 0;
}
```

**Step 4: Another Violation**
```
[STREAM PARSER] Detected TODO at line 2
[RULE VERIFIER] Violation: no-todos
[INTERVENTION] TODO detected! Implement it now!
```

**Step 5: User fixes and implements**
```javascript
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
// Save to factorial.js
```

**Step 6: Success Verified**
```
[FILE SYSTEM] Created: factorial.js
[DATABASE] Action recorded: file_created
[VERIFICATION] ✅ Implementation successful
```

## Database Schema

### Conversations Table
- `id`: Unique conversation ID
- `parent_id`: Parent conversation (for sub-tasks)
- `status`: active | completed | failed
- `depth`: Nesting level
- `prompt`: Original task description

### Actions Table
- `conversation_id`: Link to conversation
- `type`: file_created | error | command_executed | etc.
- `content`: Description of action
- `metadata`: Additional context (file paths, error types)

### Streams Table
- `conversation_id`: Link to conversation
- `chunk`: Raw output text
- `parsed_data`: Extracted events
- `timestamp`: When received

## Intervention Patterns

### Pattern 1: Planning Language
```
Trigger: "I would", "I will", "could create"
Action: Force immediate implementation
Result: Actual code instead of description
```

### Pattern 2: TODO/FIXME
```
Trigger: TODO, FIXME, XXX comments
Action: Demand immediate implementation
Result: Working code instead of placeholder
```

### Pattern 3: No Files Created
```
Trigger: Execution completes without file creation
Action: Mark as failed, demand real output
Result: Actual files in filesystem
```

## Benefits

1. **Provable Success**: Files exist = it worked
2. **Complete Audit Trail**: Every step recorded
3. **Real-time Guidance**: Fix problems as they occur
4. **Learning System**: Patterns of violations inform future improvements
5. **No Hidden Failures**: Can't pretend success without evidence

## Testing the System

1. **Build v3**:
   ```bash
   npx tsc -p tsconfig.v3.json
   ```

2. **Reload MCP** to get new tools

3. **Run Demo**:
   ```
   axiom_mcp_demo({ scenario: "violations" })
   ```

4. **Observe Results**:
   ```
   axiom_mcp_observe({ mode: "recent" })
   ```

5. **Check Principles**:
   ```
   axiom_mcp_principles({ action: "list" })
   ```

## Key Insight

**Observability without intervention is just watching things fail.**

Axiom MCP uses observation to:
- Detect violations in real-time
- Intervene immediately
- Guide execution to success
- Verify actual implementation
- Build a complete audit trail

The result: **Observable, verifiable, principle-compliant execution.**