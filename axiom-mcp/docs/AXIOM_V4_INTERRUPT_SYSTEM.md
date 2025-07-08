# Axiom V4 Interrupt System Documentation

## Overview

Axiom V4 features a sophisticated interrupt handling system that allows real-time modification of execution behavior through stream injection. This document explains how the system works and how to use it.

## Architecture

### Components

1. **HookOrchestrator** - Central hub that manages all hooks and execution flow
2. **InterruptHandlerHook** - Detects interrupt commands in the stream and injects new instructions
3. **EnhancedVerboseHook** - Provides maximum visibility with pattern detection
4. **MonitoringDashboardHook** - Real-time visualization of execution metrics
5. **PTY Executor** - Handles actual command execution with injection support

### Flow

```
User Input → HookOrchestrator → Validation Hooks → PTY Executor
                                                         ↓
                                                   Stream Output
                                                         ↓
                                              Stream Analysis Hooks
                                                         ↓
                                             Interrupt Detection?
                                                    Yes ↓ No →
                                              Command Injection
```

## Interrupt Commands

The system recognizes these interrupt patterns:

### Language Change Interrupts
- `[INTERRUPT: CHANGE TO JAVA]` - Switch implementation to Java
- `[INTERRUPT: CHANGE TO PYTHON]` - Switch implementation to Python

### Control Interrupts
- `[INTERRUPT: STOP]` - Stop all current work immediately
- `[INTERRUPT: ADD TESTS]` - Add unit tests for the code
- `[INTERRUPT: EXPLAIN]` - Explain current actions

## Usage Example

### Basic Usage

```typescript
// Enable verbose mode for maximum visibility
axiom_spawn({
  prompt: "Create a factorial function in Python",
  verboseMasterMode: true
})
```

### Sending Interrupts

While the execution is running, you can send interrupts through the stream:

1. The system starts implementing in Python
2. You see Python code being generated
3. Send `[INTERRUPT: CHANGE TO JAVA]`
4. The system stops Python implementation
5. Deletes Python code and rewrites in Java

## Enhanced Logging

With the new Logger system, you get:

- **Color-coded output** by log level
- **Component tracking** to see which part is logging
- **Stream analysis** with pattern detection
- **Timing information** for performance monitoring
- **Metrics collection** for analysis

### Log Levels

- **TRACE** (Gray) - Detailed stream data
- **DEBUG** (Cyan) - Hook execution details
- **INFO** (Green) - Normal operations
- **WARN** (Yellow) - Interrupts and interventions
- **ERROR** (Red) - Failures
- **FATAL** (Magenta) - Critical errors

## Pattern Detection

The Enhanced Verbose Hook detects:

- **File Operations**: Creation, modification
- **Language Code**: Python, Java, JavaScript
- **Errors**: Exceptions and failures
- **TODOs**: Planning vs implementation
- **Commands**: Shell commands executed
- **Interrupts**: Intervention markers

## Monitoring Dashboard

When enabled, shows real-time:

```
═══════════════════════════════════════════════════════════════
                 AXIOM V4 MONITORING DASHBOARD                 
═══════════════════════════════════════════════════════════════
Time: 2025-07-07T10:30:00.000Z | Active Tasks: 1
═══════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────┐
│ Task: abc12345 🟢 | Duration: 15.2s | Speed: 523 chars/s    │
├──────────────────────────────────────────────────────────────┤
│ Chars: 7.9K | Lines: 234 | Files: 2 | Errors: 0 | Interv: 1 │
│ Language: Java                                                │
│ Patterns: FILE_CREATED:2 | JAVA_CODE:15 | INTERRUPT_MARKER:1 │
├──────────────────────────────────────────────────────────────┤
│ Recent Events:                                                │
│   10:29:45 - execution_started                               │
│   10:29:55 - intervention                                     │
│   10:30:00 - execution_completed                             │
└──────────────────────────────────────────────────────────────┘
```

## Testing Interrupts

### Manual Test

1. Start the MCP inspector:
   ```bash
   npm run inspect:v4
   ```

2. Call the tool with verbose mode:
   ```json
   {
     "name": "axiom_spawn",
     "arguments": {
       "prompt": "Create a factorial function in Python",
       "verboseMasterMode": true
     }
   }
   ```

3. Watch the output for Python code detection

4. When you see Python being written, the interrupt handler will automatically detect specific patterns in the output

### Automated Test

Run the interrupt test script:
```bash
node dist-v4/test-interrupt.js
```

This will:
1. Start implementing factorial in Python
2. Detect Python code
3. Send interrupt to change to Java
4. Verify Java implementation

## Interrupt Compliance

The system monitors compliance:

- If an interrupt isn't followed within 5 seconds, it re-injects
- Tracks execution state to ensure interrupts are processed
- Logs all interventions for audit trail

## Configuration

### Enable Maximum Visibility

```typescript
// In your request
{
  verboseMasterMode: true,  // Enable enhanced verbose output
  // ... other args
}
```

### Hook Priorities

Hooks execute in priority order (highest first):
- 100: Enhanced Verbose Hook
- 99: Interrupt Handler Hook  
- 90: Validation Hook
- 85: Parallel Execution Hook
- 80: Verbose Monitor Hook
- 75: Intervention Hook
- 70: Universal Principles Hook
- 50: Monitoring Dashboard Hook
- 40: WebSocket Monitor Hook

## Best Practices

1. **Always enable verbose mode** for debugging
2. **Use clear interrupt commands** - they must match patterns exactly
3. **Monitor the dashboard** for real-time metrics
4. **Check logs** for detailed execution flow
5. **Test interrupts** in controlled scenarios first

## Troubleshooting

### Interrupt Not Working

1. Check if verbose mode is enabled
2. Verify interrupt pattern matches exactly
3. Look for `INTERRUPT DETECTED!` in logs
4. Check if executor supports injection

### No Output Visible

1. Ensure enhanced hooks are registered
2. Check log level (should be TRACE for max detail)
3. Verify stderr is being captured

### Performance Issues

1. Dashboard updates every 1 second
2. Disable monitoring hooks if not needed
3. Reduce log level from TRACE to INFO

## Future Enhancements

- [ ] Custom interrupt patterns
- [ ] Interrupt history and replay
- [ ] Machine learning for interrupt timing
- [ ] Multi-language interrupt chains
- [ ] Interrupt templates and macros