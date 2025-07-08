#!/bin/bash
# Axiom MCP Hook: Finalize Session
# Runs when Claude completes work - final verification and cleanup

set -e

# Configuration
AXIOM_ROOT="/home/peter/nova-mcp/axiom-mcp"
LOG_DIR="$AXIOM_ROOT/logs-v3"
STATS_FILE="$LOG_DIR/session-stats.json"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${CYAN}              Axiom MCP Session Summary${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"

# Kill any running monitors
for pid_file in /tmp/axiom-*.pid; do
    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        kill "$PID" 2>/dev/null || true
        rm -f "$pid_file"
    fi
done

# Gather session statistics
SESSION_START=$(stat -c %Y "$LOG_DIR/hooks.log" 2>/dev/null || date +%s)
SESSION_END=$(date +%s)
SESSION_DURATION=$((SESSION_END - SESSION_START))

# Count events from logs
TOTAL_INTERVENTIONS=$(grep -c "INTERVENTION" "$LOG_DIR/interventions.log" 2>/dev/null || echo "0")
TODO_DETECTIONS=$(grep -c "TODO_DETECTED" "$LOG_DIR/interventions.log" 2>/dev/null || echo "0")
PLANNING_DETECTIONS=$(grep -c "PLANNING_DETECTED" "$LOG_DIR/interventions.log" 2>/dev/null || echo "0")

# Get verification stats
if [ -f "$LOG_DIR/verification-stats.json" ]; then
    VERIFY_STATS=$(cat "$LOG_DIR/verification-stats.json")
    TOTAL_VERIFICATIONS=$(echo "$VERIFY_STATS" | jq -r '.total')
    PASSED_VERIFICATIONS=$(echo "$VERIFY_STATS" | jq -r '.passed')
    FAILED_VERIFICATIONS=$(echo "$VERIFY_STATS" | jq -r '.failed')
else
    TOTAL_VERIFICATIONS=0
    PASSED_VERIFICATIONS=0
    FAILED_VERIFICATIONS=0
fi

# Count files created/modified
FILES_CREATED=$(find . -type f -newer "$LOG_DIR/hooks.log" 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|py|md|json)$' | grep -v node_modules | wc -l || echo "0")

# Display summary
echo -e "${YELLOW}📊 Session Statistics${RESET}"
echo -e "Duration: $((SESSION_DURATION / 60)) minutes"
echo -e "Files Created/Modified: ${GREEN}$FILES_CREATED${RESET}"
echo

echo -e "${YELLOW}✅ Verification Results${RESET}"
echo -e "Total Checks: $TOTAL_VERIFICATIONS"
echo -e "Passed: ${GREEN}$PASSED_VERIFICATIONS${RESET}"
echo -e "Failed: ${RED}$FAILED_VERIFICATIONS${RESET}"
if [ "$TOTAL_VERIFICATIONS" -gt 0 ]; then
    SUCCESS_RATE=$(( (PASSED_VERIFICATIONS * 100) / TOTAL_VERIFICATIONS ))
    echo -e "Success Rate: ${SUCCESS_RATE}%"
fi
echo

echo -e "${YELLOW}🚨 Interventions${RESET}"
echo -e "Total: $TOTAL_INTERVENTIONS"
echo -e "TODO Detections: ${YELLOW}$TODO_DETECTIONS${RESET}"
echo -e "Planning Detections: ${YELLOW}$PLANNING_DETECTIONS${RESET}"
echo

# Check for uncommitted changes
if command -v git >/dev/null 2>&1 && [ -d .git ]; then
    CHANGED_FILES=$(git status --porcelain 2>/dev/null | wc -l || echo "0")
    if [ "$CHANGED_FILES" -gt 0 ]; then
        echo -e "${YELLOW}📝 Git Status${RESET}"
        echo -e "Uncommitted changes: ${YELLOW}$CHANGED_FILES files${RESET}"
        echo -e "\nModified files:"
        git status --porcelain | head -10 | sed 's/^/  /'
        if [ "$CHANGED_FILES" -gt 10 ]; then
            echo "  ... and $((CHANGED_FILES - 10)) more"
        fi
        echo
    fi
fi

# Success patterns found
if [ -f "$LOG_DIR/success-patterns.log" ]; then
    SUCCESS_COUNT=$(wc -l < "$LOG_DIR/success-patterns.log")
    if [ "$SUCCESS_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}🌟 Success Patterns${RESET}"
        echo -e "Detected $SUCCESS_COUNT successful implementations"
        echo
    fi
fi

# Recommendations based on session
echo -e "${YELLOW}💡 Recommendations${RESET}"

if [ "$TODO_DETECTIONS" -gt 5 ]; then
    echo -e "• ${RED}High TODO count${RESET} - Consider more specific prompts"
fi

if [ "$FAILED_VERIFICATIONS" -gt "$PASSED_VERIFICATIONS" ]; then
    echo -e "• ${RED}Low verification rate${RESET} - Check implementation patterns"
fi

if [ "$FILES_CREATED" -eq 0 ]; then
    echo -e "• ${RED}No files created${RESET} - Ensure concrete deliverables"
elif [ "$FILES_CREATED" -gt 10 ]; then
    echo -e "• ${GREEN}Excellent productivity!${RESET} - $FILES_CREATED files created"
fi

if [ "$TOTAL_INTERVENTIONS" -eq 0 ]; then
    echo -e "• ${GREEN}Clean execution${RESET} - No interventions needed!"
fi

# Save session stats
cat > "$STATS_FILE" << EOF
{
  "session_duration": $SESSION_DURATION,
  "files_created": $FILES_CREATED,
  "verifications": {
    "total": $TOTAL_VERIFICATIONS,
    "passed": $PASSED_VERIFICATIONS,
    "failed": $FAILED_VERIFICATIONS
  },
  "interventions": {
    "total": $TOTAL_INTERVENTIONS,
    "todo_detections": $TODO_DETECTIONS,
    "planning_detections": $PLANNING_DETECTIONS
  },
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}Session complete. Stats saved to: $STATS_FILE${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"

# Archive logs if they're getting large
LOGS_SIZE=$(du -sk "$LOG_DIR" | cut -f1)
if [ "$LOGS_SIZE" -gt 10240 ]; then  # 10MB
    echo -e "${YELLOW}Note: Logs are getting large (${LOGS_SIZE}KB). Consider archiving.${RESET}"
fi

exit 0