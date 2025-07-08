#!/bin/bash
# Axiom MCP Hook: Verify Implementation
# Runs after tools to ensure actual implementation happened

set -e

# Configuration
AXIOM_ROOT="/home/peter/nova-mcp/axiom-mcp"
LOG_FILE="$AXIOM_ROOT/logs-v3/verification.log"
STATS_FILE="$AXIOM_ROOT/logs-v3/verification-stats.json"

# Tool information
TOOL_NAME=${TOOL_NAME:-"unknown"}
TOOL_EXIT=${TOOL_EXIT_CODE:-0}

# Helper function for logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$TOOL_NAME] $1" >> "$LOG_FILE"
    echo "[AXIOM-VERIFY] $1" >&2
}

# Skip verification for certain tools
case "$TOOL_NAME" in
    axiom_mcp_logs|axiom_mcp_status|axiom_mcp_observe)
        log "Skipping verification for read-only tool: $TOOL_NAME"
        exit 0
        ;;
esac

# Extract results
RESULT=$(echo "$TOOL_RESULT" | jq -r '.content[0].text // empty' 2>/dev/null || echo "$TOOL_RESULT")

# Initialize verification results
VERIFICATION_PASSED=true
ISSUES=""

# Check 1: Files Created
FILES_CREATED=$(echo "$RESULT" | grep -oE "(Created|Updated|Modified).*\.(ts|tsx|js|jsx|py|md|json)" | wc -l)
if echo "$RESULT" | grep -iE "(create|implement|build)" > /dev/null && [ "$FILES_CREATED" -eq 0 ]; then
    if ! echo "$RESULT" | grep -iE "(already exists|no changes needed)" > /dev/null; then
        VERIFICATION_PASSED=false
        ISSUES="$ISSUES\n- No files created despite creation task"
        log "FAIL: No files created"
    fi
fi

# Check 2: TODO/Planning Language
TODO_COUNT=$(echo "$RESULT" | grep -ciE "(todo|fixme|would implement|could create|might)" || true)
if [ "$TODO_COUNT" -gt 2 ]; then
    VERIFICATION_PASSED=false
    ISSUES="$ISSUES\n- Excessive planning language detected ($TODO_COUNT instances)"
    log "FAIL: Too many TODOs/planning phrases"
fi

# Check 3: Error Patterns
ERROR_COUNT=$(echo "$RESULT" | grep -ciE "(error|failed|exception|not found)" || true)
if [ "$ERROR_COUNT" -gt 0 ] && [ "$TOOL_EXIT" -eq 0 ]; then
    # Errors in output but tool reported success
    log "WARNING: Errors in output but tool reported success"
fi

# Check 4: Implementation Patterns
IMPL_PATTERNS=$(echo "$RESULT" | grep -ciE "(function|class|interface|export|import|def |CREATE TABLE|INSERT INTO)" || true)
if echo "$TOOL_ARGS" | grep -iE "(implement|create.*function|build.*component)" > /dev/null && [ "$IMPL_PATTERNS" -eq 0 ]; then
    VERIFICATION_PASSED=false
    ISSUES="$ISSUES\n- No implementation code detected"
    log "FAIL: No code implementation found"
fi

# Check 5: File Size Verification (for claimed file creations)
if echo "$RESULT" | grep -E "(Created|Generated).*file" > /dev/null; then
    # Extract file paths
    FILE_PATHS=$(echo "$RESULT" | grep -oE '/[^ ]+\.(ts|tsx|js|jsx|py|md|json)' | sort -u)
    
    for FILE in $FILE_PATHS; do
        if [ -f "$FILE" ]; then
            SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null || echo "0")
            if [ "$SIZE" -lt 50 ]; then
                VERIFICATION_PASSED=false
                ISSUES="$ISSUES\n- File $FILE is suspiciously small ($SIZE bytes)"
                log "FAIL: Small file detected: $FILE"
            fi
        else
            VERIFICATION_PASSED=false
            ISSUES="$ISSUES\n- Claimed file doesn't exist: $FILE"
            log "FAIL: Missing file: $FILE"
        fi
    done
fi

# Check 6: Test Execution (if tests mentioned)
if echo "$TOOL_ARGS" | grep -iE "test" > /dev/null; then
    TEST_RESULTS=$(echo "$RESULT" | grep -ciE "(test.*pass|✓|✅|passed|PASS)" || true)
    if [ "$TEST_RESULTS" -eq 0 ]; then
        log "WARNING: No test results found for test-related task"
    fi
fi

# Update statistics
if [ ! -f "$STATS_FILE" ]; then
    echo '{"total":0,"passed":0,"failed":0,"warnings":0}' > "$STATS_FILE"
fi

if [ "$VERIFICATION_PASSED" = true ]; then
    log "Verification PASSED"
    jq '.total += 1 | .passed += 1' "$STATS_FILE" > "$STATS_FILE.tmp" && mv "$STATS_FILE.tmp" "$STATS_FILE"
    
    # Check for exceptional performance
    if [ "$FILES_CREATED" -gt 3 ] && [ "$TODO_COUNT" -eq 0 ]; then
        log "EXCELLENT: Multiple files created with no TODOs!"
        echo -e "\n🌟 EXCELLENT IMPLEMENTATION: $FILES_CREATED files, zero TODOs!" >&2
    fi
else
    log "Verification FAILED"
    jq '.total += 1 | .failed += 1' "$STATS_FILE" > "$STATS_FILE.tmp" && mv "$STATS_FILE.tmp" "$STATS_FILE"
    
    # Report issues
    cat >&2 << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ VERIFICATION FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Issues detected:
$(echo -e "$ISSUES")

Required actions:
1. Create actual files, not just plans
2. Write actual code, not TODOs
3. Verify files exist and have content
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

    # Trigger intervention
    if [ -x "$AXIOM_ROOT/hooks/axiom-intervene" ]; then
        "$AXIOM_ROOT/hooks/axiom-intervene" "VERIFICATION_FAILED" "$ISSUES"
    fi
    
    # Non-blocking by default (return 0)
    # Change to 'exit 2' to make blocking
fi

# Special handling for axiom_mcp_spawn results
if [ "$TOOL_NAME" = "axiom_mcp_spawn" ]; then
    # Check spawn-specific success criteria
    SUBTASKS=$(echo "$RESULT" | grep -c "Subtask" || true)
    IMPLEMENTATION=$(echo "$RESULT" | grep -ciE "(implement|created|built)" || true)
    
    if [ "$SUBTASKS" -gt 0 ] && [ "$IMPLEMENTATION" -eq 0 ]; then
        log "WARNING: Spawn created subtasks but no implementation detected"
        echo -e "\n⚠️  WARNING: Subtasks created but no concrete implementation found" >&2
    fi
fi

# Display quick stats
STATS=$(cat "$STATS_FILE")
TOTAL=$(echo "$STATS" | jq -r '.total')
PASSED=$(echo "$STATS" | jq -r '.passed')
RATE=$(( (PASSED * 100) / TOTAL ))

echo -e "\n📊 Verification Stats: $PASSED/$TOTAL passed (${RATE}% success rate)" >&2

exit 0