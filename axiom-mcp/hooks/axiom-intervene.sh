#!/bin/bash
# Axiom MCP Hook: Central Intervention System
# Handles pattern-based interventions to ensure implementation

set -e

# Configuration
AXIOM_ROOT="/home/peter/nova-mcp/axiom-mcp"
MCP_CLI="npx @modelcontextprotocol/cli"
LOG_FILE="$AXIOM_ROOT/logs-v3/interventions.log"

# Arguments
INTERVENTION_TYPE=${1:-"UNKNOWN"}
CONTEXT=${2:-""}
EXTRA_DATA=${3:-""}

# Helper function for logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$INTERVENTION_TYPE] $1" >> "$LOG_FILE"
    echo "[AXIOM-INTERVENTION] $1" >&2
}

# Helper to call MCP tools
call_mcp_tool() {
    local tool=$1
    shift
    local args="$@"
    
    # Use the MCP CLI to call tools
    $MCP_CLI call "$AXIOM_ROOT/dist-v3/index.js" "$tool" "$args" 2>/dev/null || true
}

# Main intervention logic
case "$INTERVENTION_TYPE" in
    TODO_DETECTED)
        log "TODO pattern detected: ${CONTEXT:0:100}"
        
        # Extract file references from context
        FILES=$(echo "$CONTEXT" | grep -oE '[a-zA-Z0-9_/-]+\.(ts|tsx|js|jsx|py|md)' | sort -u)
        
        if [ -n "$FILES" ]; then
            log "Creating stub files: $FILES"
            for FILE in $FILES; do
                DIR=$(dirname "$FILE")
                [ ! -d "$DIR" ] && mkdir -p "$DIR"
                
                if [ ! -f "$FILE" ]; then
                    case "$FILE" in
                        *.ts|*.tsx)
                            cat > "$FILE" << 'EOF'
// INTERVENTION: File created by axiom-intervene
// TODO was detected - implement this NOW

export function implement(): void {
    throw new Error("Not implemented - TODO detected, implement immediately!");
}
EOF
                            ;;
                        *.py)
                            cat > "$FILE" << 'EOF'
# INTERVENTION: File created by axiom-intervene
# TODO was detected - implement this NOW

def implement():
    raise NotImplementedError("TODO detected - implement immediately!")
EOF
                            ;;
                        *)
                            echo "<!-- INTERVENTION: TODO detected - implement immediately! -->" > "$FILE"
                            ;;
                    esac
                    log "Created stub: $FILE"
                fi
            done
        fi
        
        # Update settings to force implementation
        call_mcp_tool "axiom_mcp_settings" '{"action":"set","setting":"intervention.forceImplementation","value":true}'
        
        # Log the violation
        call_mcp_tool "axiom_mcp_principles" '{"action":"check","code":"'$CONTEXT'"}'
        ;;
        
    PLANNING_DETECTED)
        log "Planning language detected: ${CONTEXT:0:100}"
        
        # Send a strong signal that implementation is required
        cat >&2 << 'EOF'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 INTERVENTION: PLANNING DETECTED - IMMEDIATE ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You used planning language ("would implement", "could create", etc.)
This is not acceptable. You must:

1. CREATE the actual files NOW
2. WRITE the actual code NOW  
3. TEST the implementation NOW

No more planning. Execute immediately.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
        
        # Force a status check to show what should be happening
        call_mcp_tool "axiom_mcp_status" '{"view":"tasks","format":"summary"}'
        ;;
        
    NO_PROGRESS)
        IDLE_TIME=${CONTEXT:-"unknown"}
        log "No progress for ${IDLE_TIME} seconds"
        
        # Check current task status
        echo >&2 "⏰ Checking task progress..."
        call_mcp_tool "axiom_mcp_status" '{"view":"tasks"}'
        
        # Check recent logs
        echo >&2 "📋 Recent activity:"
        call_mcp_tool "axiom_mcp_logs" '{"action":"tail","limit":10}'
        
        # Prompt for specific action
        cat >&2 << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ NO PROGRESS DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No file changes detected in the last ${IDLE_TIME} seconds.

REQUIRED: State specifically:
1. What file are you currently editing?
2. What function/component are you implementing?
3. What is blocking progress?

If you're thinking/planning, STOP and write code instead.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
        ;;
        
    FILE_VERIFICATION)
        log "Verifying file operations"
        
        # Extract claimed files from context
        FILES=$(echo "$CONTEXT" | jq -r '.filesCreated[]?' 2>/dev/null || echo "")
        
        MISSING=""
        for FILE in $FILES; do
            if [ ! -f "$FILE" ]; then
                MISSING="$MISSING $FILE"
                log "ERROR: Claimed file doesn't exist: $FILE"
            else
                SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null || echo "0")
                if [ "$SIZE" -lt 10 ]; then
                    log "WARNING: File exists but seems empty: $FILE (${SIZE} bytes)"
                fi
            fi
        done
        
        if [ -n "$MISSING" ]; then
            echo >&2 "❌ VERIFICATION FAILED: Missing files:$MISSING"
            exit 1
        fi
        ;;
        
    PATTERN_VIOLATION)
        PATTERN=${CONTEXT:-"unknown"}
        log "Pattern violation: $PATTERN"
        
        # Log to principles system
        call_mcp_tool "axiom_mcp_principles" "{
            \"action\": \"add\",
            \"principle\": {
                \"id\": \"pattern-$RANDOM\",
                \"name\": \"Violation: $PATTERN\",
                \"category\": \"execution\",
                \"description\": \"Auto-detected pattern violation\",
                \"verificationRule\": \"Pattern '$PATTERN' should not appear in output\"
            }
        }"
        ;;
        
    SUCCESS_DETECTED)
        log "Success pattern detected: ${CONTEXT:0:100}"
        
        # Extract and save successful patterns
        echo "$CONTEXT" >> "$AXIOM_ROOT/logs-v3/success-patterns.log"
        
        # Could trigger commit here if appropriate
        if echo "$CONTEXT" | grep -E "(test.*pass|all.*green|build.*success)" > /dev/null; then
            log "Tests passing - ready for commit"
        fi
        ;;
        
    EMERGENCY_STOP)
        log "EMERGENCY STOP requested"
        
        # Kill all axiom-related processes
        pkill -f "axiom-mcp" || true
        pkill -f "axiom_mcp" || true
        
        # Clear any locks
        rm -f /tmp/axiom-*.pid
        
        echo >&2 "🛑 EMERGENCY STOP - All Axiom processes terminated"
        ;;
        
    *)
        log "Unknown intervention type: $INTERVENTION_TYPE"
        ;;
esac

# Update intervention statistics
STATS_FILE="$AXIOM_ROOT/logs-v3/intervention-stats.json"
if [ -f "$STATS_FILE" ]; then
    # Update existing stats
    jq --arg type "$INTERVENTION_TYPE" '.[$type] += 1' "$STATS_FILE" > "$STATS_FILE.tmp" && mv "$STATS_FILE.tmp" "$STATS_FILE"
else
    # Create new stats file
    echo "{\"$INTERVENTION_TYPE\": 1}" > "$STATS_FILE"
fi

exit 0