# Axiom MCP Hooks Strategy: From Vision to Execution

## Executive Summary

This document outlines a comprehensive hooks strategy that transforms Axiom MCP from a passive planning tool into an active execution guardian. By leveraging Claude Code hooks at critical lifecycle points, we enforce implementation over planning, enable real-time observation, and provide intelligent intervention.

## The Problem: Before Hooks

### Current State
1. **Research Loops**: Claude spends time planning instead of implementing
2. **No Verification**: Claims success without checking if files were created
3. **Post-Mortem Only**: Can only analyze failures after they happen
4. **Disconnected Components**: PTY executor, MCTS, and intervention system aren't wired together
5. **Manual Enforcement**: Humans must constantly remind Claude to implement

### Impact
- 80% of prompts result in TODO lists instead of code
- Violations detected but not prevented
- No real-time visibility into execution
- Parallel execution vision remains theoretical

## The Solution: After Hooks

### Desired State
1. **Forced Implementation**: Block execution until concrete deliverables defined
2. **Real-time Verification**: Check files exist as they're created
3. **Active Intervention**: Fix problems during execution, not after
4. **Connected Pipeline**: Hooks wire together all v3 components
5. **Automatic Enforcement**: System ensures implementation without human intervention

### Expected Impact
- 90% reduction in TODO-only outputs
- Violations prevented before they occur
- Character-by-character stream visibility
- Parallel execution becomes reality

## Hook Strategy: The Four Pillars

### 1. Pre-Execution Validation (PreToolUse)

**WHY**: Prevent research loops before they start

**BEFORE**: 
```
User: "Implement user authentication"
Claude: "I'll research authentication patterns..."
[30 minutes of planning, no code]
```

**AFTER**:
```
User: "Implement user authentication"
Hook: Blocks execution, demands specific files to create
Claude: Forced to specify auth.ts, login.tsx, tests
[Immediate implementation begins]
```

**HOOKS**:
- `axiom-validate-concrete`: Ensure task has file deliverables
- `axiom-block-research`: Prevent "research", "consider", "might" keywords
- `axiom-require-tests`: Mandate test file for every implementation

### 2. Stream Monitoring (PostToolUse + Custom)

**WHY**: Enable real-time observation and pattern detection

**BEFORE**:
```
[Claude executing...]
[User waits 5 minutes]
User: "What's happening?"
[No visibility]
```

**AFTER**:
```
[Claude executing...]
[Hook streams output in real-time]
[Hook detects "TODO" pattern]
[Hook intervenes immediately]
```

**HOOKS**:
- `axiom-stream-monitor`: Tail logs with pattern detection
- `axiom-progress-tracker`: Alert if no file changes in 30s
- `axiom-pattern-detector`: Watch for anti-patterns

### 3. Active Intervention (PostToolUse)

**WHY**: Fix problems in real-time, not post-mortem

**BEFORE**:
```
Claude: "I would implement this as..."
[Never actually implements]
[Task marked complete]
```

**AFTER**:
```
Claude: "I would implement this as..."
Hook: Detects "would implement"
Hook: Forces immediate file creation
Hook: Blocks completion until verified
```

**HOOKS**:
- `axiom-force-implementation`: Convert plans to code
- `axiom-fix-violations`: Auto-correct detected issues
- `axiom-verify-files`: Ensure claimed files exist

### 4. Success Amplification (Stop/SubagentStop)

**WHY**: Learn from successes and spread patterns

**BEFORE**:
```
[Successful implementation]
[Pattern lost, not reused]
[Next task repeats mistakes]
```

**AFTER**:
```
[Successful implementation]
Hook: Extracts successful patterns
Hook: Updates rule weights
Hook: Applies to future tasks
```

**HOOKS**:
- `axiom-extract-patterns`: Identify what worked
- `axiom-update-rules`: Adjust intervention rules
- `axiom-commit-success`: Auto-commit good code

## Implementation Plan: Phased Approach

### Phase 1: Foundation (Week 1)
1. **Basic Validation Hooks**
   - Create axiom-validate-concrete
   - Create axiom-block-research
   - Test with axiom_mcp_spawn

2. **Simple Monitoring**
   - Create axiom-stream-monitor
   - Display verbose output in terminal
   - Log all tool calls

3. **Configuration**
   ```json
   {
     "hooks": {
       "PreToolUse": [{
         "matcher": "axiom_mcp_spawn",
         "hooks": [{
           "type": "command",
           "command": "/usr/local/bin/axiom-validate-concrete"
         }]
       }]
     }
   }
   ```

### Phase 2: Real-time Intervention (Week 2)
1. **Pattern Detection**
   - Create axiom-pattern-detector
   - Watch for TODO, research loops
   - Emit intervention events

2. **Active Fixes**
   - Create axiom-force-implementation
   - Convert plans to actual code
   - Create missing files

3. **Progress Tracking**
   - Monitor file system changes
   - Alert on stalled execution
   - Force progress checks

### Phase 3: Parallel Execution (Week 3)
1. **Worktree Management**
   - Create axiom-spawn-worktree
   - Isolate parallel attempts
   - Track execution paths

2. **Stream Aggregation**
   - Merge outputs from parallel streams
   - Identify best implementation
   - Kill failing branches

3. **MCTS Integration**
   - Score based on actual progress
   - Allocate resources dynamically
   - Optimize execution paths

### Phase 4: Learning System (Week 4)
1. **Pattern Extraction**
   - Analyze successful executions
   - Build pattern library
   - Update intervention rules

2. **Rule Optimization**
   - Track rule effectiveness
   - A/B test interventions
   - Evolve rule weights

3. **Automatic Improvement**
   - Self-tuning system
   - Predictive intervention
   - Preemptive fixes

## Hook Scripts: Detailed Implementation

### 1. axiom-validate-concrete
```bash
#!/bin/bash
# Ensures task has concrete deliverables

# Extract prompt from tool args
PROMPT=$(echo "$TOOL_ARGS" | jq -r '.parentPrompt // .prompt // ""')

# Check for concrete deliverables
if ! echo "$PROMPT" | grep -E "(create|implement|write|build|fix)" > /dev/null; then
  echo '{"continue": false, "reason": "Task must specify concrete action (create/implement/write/build/fix)"}'
  exit 2
fi

# Require file specifications
if ! echo "$PROMPT" | grep -E "\.(ts|tsx|js|py|md|json)" > /dev/null; then
  # Ask for specific files
  echo '{"continue": false, "reason": "Specify exact files to create/modify (e.g., auth.ts, login.tsx)"}'
  exit 2
fi

# Log validation passed
echo "[AXIOM] Validation passed: Concrete task with file deliverables" >&2
exit 0
```

### 2. axiom-stream-monitor
```bash
#!/bin/bash
# Real-time output streaming with pattern detection

# Find latest log file
LOG_FILE=$(ls -t /home/peter/nova-mcp/logs-v3/axiom-events-*.jsonl 2>/dev/null | head -1)

if [ -z "$LOG_FILE" ]; then
  echo "[AXIOM] No log file found" >&2
  exit 0
fi

# Stream log with pattern detection
tail -f "$LOG_FILE" | while read line; do
  # Extract output from JSON
  OUTPUT=$(echo "$line" | jq -r '.payload.output // empty' 2>/dev/null)
  
  if [ -n "$OUTPUT" ]; then
    # Colorize output by prefix
    PREFIX=$(echo "$OUTPUT" | cut -d: -f1)
    case "$PREFIX" in
      *ERROR*) echo -e "\033[31m$OUTPUT\033[0m" ;;
      *SUCCESS*) echo -e "\033[32m$OUTPUT\033[0m" ;;
      *TODO*) 
        echo -e "\033[33m$OUTPUT\033[0m"
        # Trigger intervention
        /usr/local/bin/axiom-intervene "TODO_DETECTED" "$OUTPUT"
        ;;
      *) echo "$OUTPUT" ;;
    esac
  fi
done &

# Store background process ID
echo $! > /tmp/axiom-stream-monitor.pid
```

### 3. axiom-force-implementation
```bash
#!/bin/bash
# Forces actual implementation when plans detected

# Check tool output for planning keywords
OUTPUT=$(echo "$TOOL_RESULT" | jq -r '.content[0].text // ""' 2>/dev/null)

if echo "$OUTPUT" | grep -iE "(would implement|could create|might use|consider using)" > /dev/null; then
  echo "[AXIOM] Planning detected - forcing implementation!" >&2
  
  # Extract mentioned files
  FILES=$(echo "$OUTPUT" | grep -oE '[a-zA-Z0-9_-]+\.(ts|tsx|js|py|md|json)' | sort -u)
  
  if [ -n "$FILES" ]; then
    # Create missing files
    for FILE in $FILES; do
      if [ ! -f "$FILE" ]; then
        echo "[AXIOM] Creating missing file: $FILE" >&2
        
        # Create with appropriate template
        case "$FILE" in
          *.ts|*.tsx)
            echo "// TODO: Implement $FILE" > "$FILE"
            echo "export {}" >> "$FILE"
            ;;
          *.py)
            echo "# TODO: Implement $FILE" > "$FILE"
            echo "pass" >> "$FILE"
            ;;
          *)
            touch "$FILE"
            ;;
        esac
      fi
    done
    
    # Force re-execution with implementation focus
    echo '{"continue": true, "reason": "Files created - now implement the actual code"}'
  fi
fi

exit 0
```

### 4. axiom-verify-files
```bash
#!/bin/bash
# Verifies claimed file operations actually happened

# Extract file operations from result
FILES_CLAIMED=$(echo "$TOOL_RESULT" | jq -r '.filesCreated[]? // empty' 2>/dev/null)

if [ -n "$FILES_CLAIMED" ]; then
  MISSING_FILES=""
  
  for FILE in $FILES_CLAIMED; do
    if [ ! -f "$FILE" ]; then
      MISSING_FILES="$MISSING_FILES $FILE"
    fi
  done
  
  if [ -n "$MISSING_FILES" ]; then
    echo "[AXIOM] ERROR: Claimed files don't exist: $MISSING_FILES" >&2
    
    # Log violation
    axiom_mcp_principles action=add principle='{
      "id": "file-verification",
      "name": "Files Must Exist",
      "category": "execution",
      "description": "Claimed file creations must be verifiable",
      "verificationRule": "All files in filesCreated array must exist on disk"
    }'
    
    exit 1
  fi
fi

echo "[AXIOM] File verification passed" >&2
exit 0
```

### 5. axiom-intervene
```bash
#!/bin/bash
# Central intervention dispatcher

INTERVENTION_TYPE=$1
CONTEXT=$2

case "$INTERVENTION_TYPE" in
  TODO_DETECTED)
    # Kill the stream monitor
    if [ -f /tmp/axiom-stream-monitor.pid ]; then
      kill $(cat /tmp/axiom-stream-monitor.pid) 2>/dev/null
    fi
    
    # Send intervention command
    echo "[AXIOM] INTERVENTION: TODO detected - forcing immediate implementation" >&2
    
    # Use MCP tool to update settings
    axiom_mcp_settings action=set setting="intervention.forceImplementation" value=true
    ;;
    
  NO_PROGRESS)
    echo "[AXIOM] INTERVENTION: No progress detected - checking status" >&2
    axiom_mcp_status view=tasks | head -20
    ;;
    
  PATTERN_DETECTED)
    echo "[AXIOM] INTERVENTION: Pattern '$CONTEXT' detected" >&2
    axiom_mcp_principles action=verify conversationId=current
    ;;
esac
```

## Metrics for Success

### Phase 1 Metrics
- ❌ TODO-only outputs: Target < 20% (from 80%)
- ✅ File creation rate: Target > 80% of tasks
- ⏱️ Time to first file: Target < 30 seconds

### Phase 2 Metrics
- 🔍 Pattern detection rate: Target > 95%
- 🛠️ Intervention success: Target > 75%
- 📈 Progress stalls: Target < 10%

### Phase 3 Metrics
- 🌳 Parallel execution: Target 3-5 worktrees
- 🎯 Best path selection: Target > 85% accuracy
- ⚡ Speed improvement: Target 3x faster

### Phase 4 Metrics
- 🧠 Pattern library size: Target > 100 patterns
- 📊 Rule effectiveness: Target > 90%
- 🤖 Autonomous improvement: Target 10% monthly

## Risk Mitigation

### Security Risks
1. **Command Injection**: Sanitize all inputs
2. **Resource Exhaustion**: Add timeouts
3. **File System Damage**: Restrict paths

### Operational Risks
1. **Hook Failures**: Graceful degradation
2. **Performance Impact**: Async execution
3. **False Positives**: Tunable thresholds

### Technical Risks
1. **Integration Complexity**: Phased rollout
2. **State Management**: Idempotent hooks
3. **Debugging Difficulty**: Comprehensive logging

## Conclusion

This hook strategy transforms Axiom MCP from a theoretical framework into a practical execution system. By enforcing implementation at every step, monitoring progress in real-time, and intervening intelligently, we create a system that actually delivers code instead of just planning it.

The phased approach ensures we build on solid foundations while maintaining the flexibility to adapt based on real-world usage. Most importantly, the hooks create a feedback loop that allows the system to improve itself over time.

> "With hooks, Axiom MCP becomes what it was always meant to be: an intelligent execution guardian that ensures code gets written, tested, and delivered."