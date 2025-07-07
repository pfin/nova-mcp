#!/bin/bash
# Axiom MCP Hook: Validate Concrete Deliverables
# Ensures tasks have specific implementation targets, not just research

set -e

# Configuration
AXIOM_ROOT="/home/peter/nova-mcp/axiom-mcp"
LOG_FILE="$AXIOM_ROOT/logs-v3/hooks.log"

# Helper function for logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [axiom-validate-concrete] $1" >> "$LOG_FILE"
    echo "[AXIOM-VALIDATE] $1" >&2
}

# Extract prompt from tool args
PROMPT=$(echo "$TOOL_ARGS" | jq -r '.parentPrompt // .prompt // ""' 2>/dev/null || echo "")
TOOL_NAME=${TOOL_NAME:-"unknown"}

log "Validating tool: $TOOL_NAME"
log "Prompt: ${PROMPT:0:100}..."

# Skip validation for non-spawn tools
if [[ "$TOOL_NAME" != "axiom_mcp_spawn" ]] && [[ "$TOOL_NAME" != "axiom_test_v3" ]]; then
    log "Skipping validation for $TOOL_NAME"
    exit 0
fi

# Check 1: Concrete action verbs
if ! echo "$PROMPT" | grep -iE "(create|implement|write|build|fix|add|update|refactor|test)" > /dev/null; then
    log "BLOCKED: No concrete action verb found"
    cat <<EOF
{
  "continue": false,
  "reason": "Task must specify concrete action. Use verbs like: create, implement, write, build, fix, add, update, refactor, test.\n\nExample: 'Create auth.ts with login functionality' instead of 'Research authentication patterns'"
}
EOF
    exit 2
fi

# Check 2: Specific deliverables or file references
HAS_FILE_REF=$(echo "$PROMPT" | grep -E "\.(ts|tsx|js|jsx|py|rs|go|md|json|yaml|yml|sh)" | wc -l)
HAS_COMPONENT=$(echo "$PROMPT" | grep -iE "(component|function|class|module|feature|endpoint|api|test)" | wc -l)

if [ "$HAS_FILE_REF" -eq 0 ] && [ "$HAS_COMPONENT" -eq 0 ]; then
    log "BLOCKED: No specific deliverables found"
    cat <<EOF
{
  "continue": false,
  "reason": "Task must specify concrete deliverables. Include:\n- Specific files (e.g., auth.ts, UserLogin.tsx)\n- Components/features (e.g., 'login component', 'auth endpoint')\n- Clear outputs (e.g., 'function to validate emails')\n\nBe specific about WHAT you want created."
}
EOF
    exit 2
fi

# Check 3: Block pure research/planning keywords
if echo "$PROMPT" | grep -iE "^(research|explore|investigate|consider|plan|think about|look into)" > /dev/null; then
    log "BLOCKED: Research-first approach detected"
    cat <<EOF
{
  "continue": false,
  "reason": "Start with implementation, not research. Instead of 'Research auth patterns', try:\n- 'Create auth.ts with JWT authentication'\n- 'Implement login endpoint in api/auth/route.ts'\n- 'Build UserAuth component with email/password fields'\n\nYou can research WHILE implementing."
}
EOF
    exit 2
fi

# Check 4: Block vague requests
VAGUE_PATTERNS="(how to|what is|explain|can you|could you|would you|tell me about)"
if echo "$PROMPT" | grep -iE "^${VAGUE_PATTERNS}" > /dev/null; then
    log "BLOCKED: Vague request pattern"
    cat <<EOF
{
  "continue": false,
  "reason": "Be specific and action-oriented. Instead of questions, give commands:\n- ❌ 'How to implement auth?' → ✅ 'Implement JWT auth in auth.ts'\n- ❌ 'Can you create a login?' → ✅ 'Create LoginForm component in components/auth/'\n- ❌ 'Explain React hooks' → ✅ 'Create useAuth hook with login/logout functions'"
}
EOF
    exit 2
fi

# Check 5: Require success criteria (for complex tasks)
WORD_COUNT=$(echo "$PROMPT" | wc -w)
if [ "$WORD_COUNT" -gt 20 ]; then
    # For longer prompts, check for success criteria
    if ! echo "$PROMPT" | grep -iE "(should|must|need to|ensure|verify|test|with|including)" > /dev/null; then
        log "WARNING: Complex task without clear success criteria"
        # Just warn, don't block
    fi
fi

# Check 6: Boost score for best practices
SCORE=0
echo "$PROMPT" | grep -iE "test" > /dev/null && ((SCORE+=10)) && log "Bonus: Includes testing"
echo "$PROMPT" | grep -iE "type|interface|schema" > /dev/null && ((SCORE+=5)) && log "Bonus: Includes types"
echo "$PROMPT" | grep -iE "error|handle|catch|validate" > /dev/null && ((SCORE+=5)) && log "Bonus: Includes error handling"

# Special handling for common patterns
if echo "$PROMPT" | grep -iE "todo|fixme" > /dev/null; then
    log "WARNING: TODO/FIXME detected - ensure these are addressed"
fi

log "Validation PASSED (score: $SCORE)"

# Add metadata for downstream hooks
cat <<EOF
{
  "continue": true,
  "metadata": {
    "validation_score": $SCORE,
    "has_files": $HAS_FILE_REF,
    "has_components": $HAS_COMPONENT,
    "word_count": $WORD_COUNT,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF

exit 0