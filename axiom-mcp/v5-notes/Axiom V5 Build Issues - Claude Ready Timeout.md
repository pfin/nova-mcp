# Axiom V5 Build Issues - Claude Ready Timeout

## Issue Observed
When using `axiom_orthogonal_decompose` to build V5, all tasks fail with "Claude ready timeout" after handling trust dialog.

### Debug Log Analysis
```
[2025-07-13T09:24:17.904Z] Task implementation - Handling trust dialog
[2025-07-13T09:24:48.315Z] Task implementation error (attempt 1): Claude ready timeout
```

Pattern repeats for all 3 attempts on both tasks:
- implementation task: Failed after 3 attempts (total ~128 seconds)
- integration task: Failed after 3 attempts (total ~31 seconds)

## Root Cause Hypothesis
1. Claude instance isn't entering ready state after trust dialog
2. Timeout might be too short for complex prompts
3. PTY ready detection pattern might be wrong

## Alternative Approach
Instead of using orthogonal decompose, try:
1. Use regular `axiom_spawn` with verbose mode to see actual output
2. Start with simpler prompt to verify Claude control works
3. Build V5 modules incrementally

## Key Insight
The orthogonal decomposer is spawning Claude instances but they're not reaching the ready state. This suggests the PTY control issue is at a lower level than the decomposition logic.