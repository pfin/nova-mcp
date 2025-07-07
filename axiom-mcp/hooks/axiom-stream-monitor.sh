#!/bin/bash
# Axiom MCP Hook: Real-time Stream Monitor
# Displays execution output with pattern detection and intervention triggers

set -e

# Configuration
AXIOM_ROOT="/home/peter/nova-mcp/axiom-mcp"
LOG_DIR="$AXIOM_ROOT/logs-v3"
HOOKS_DIR="$AXIOM_ROOT/hooks"
PID_FILE="/tmp/axiom-stream-monitor.pid"

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Kill any existing monitor
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null)
    if [ -n "$OLD_PID" ]; then
        kill "$OLD_PID" 2>/dev/null || true
        kill $(pgrep -P "$OLD_PID") 2>/dev/null || true
    fi
fi

# Find the latest log file
LOG_FILE=$(ls -t "$LOG_DIR"/axiom-events-*.jsonl 2>/dev/null | head -1)

if [ -z "$LOG_FILE" ]; then
    echo -e "${YELLOW}[AXIOM-MONITOR] No log file found yet${RESET}" >&2
    exit 0
fi

echo -e "${CYAN}[AXIOM-MONITOR] Streaming from: $(basename "$LOG_FILE")${RESET}" >&2
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}" >&2

# Pattern detection and intervention
detect_patterns() {
    local line="$1"
    local output=$(echo "$line" | jq -r '.payload.output // empty' 2>/dev/null)
    
    if [ -z "$output" ]; then
        return
    fi
    
    # Extract prefix and content
    local prefix=$(echo "$output" | cut -d: -f1)
    local content=$(echo "$output" | cut -d: -f2-)
    
    # Pattern detection with interventions
    case "$output" in
        *TODO*|*FIXME*)
            echo -e "${YELLOW}⚠️  TODO DETECTED${RESET}: $output" >&2
            if [ -x "$HOOKS_DIR/axiom-intervene" ]; then
                "$HOOKS_DIR/axiom-intervene" "TODO_DETECTED" "$output" &
            fi
            ;;
            
        *"would implement"*|*"could create"*|*"might use"*)
            echo -e "${RED}🚫 PLANNING DETECTED${RESET}: $output" >&2
            if [ -x "$HOOKS_DIR/axiom-intervene" ]; then
                "$HOOKS_DIR/axiom-intervene" "PLANNING_DETECTED" "$output" &
            fi
            ;;
            
        *ERROR*|*FAILED*|*Exception*)
            echo -e "${RED}❌ ERROR${RESET}: $output" >&2
            ;;
            
        *SUCCESS*|*COMPLETE*|*"✅"*)
            echo -e "${GREEN}✅ SUCCESS${RESET}: $output" >&2
            ;;
            
        *"File created"*|*"File updated"*)
            echo -e "${GREEN}📄 FILE OPERATION${RESET}: $output" >&2
            ;;
            
        *"Running test"*|*"Test passed"*)
            echo -e "${BLUE}🧪 TEST${RESET}: $output" >&2
            ;;
            
        *INTERVENTION*|*VIOLATION*)
            echo -e "${PURPLE}🚨 INTERVENTION${RESET}: $output" >&2
            ;;
            
        *"git "*|*"npm "*|*"yarn "*)
            echo -e "${CYAN}⚡ COMMAND${RESET}: $output" >&2
            ;;
            
        *)
            # Color by prefix
            case "$prefix" in
                *"[SPAWN"*) echo -e "${BOLD}$output${RESET}" >&2 ;;
                *"[TASK"*) echo -e "${BLUE}$output${RESET}" >&2 ;;
                *"[EXEC"*) echo -e "${CYAN}$output${RESET}" >&2 ;;
                *) echo "$output" >&2 ;;
            esac
            ;;
    esac
}

# Progress tracking
LAST_ACTIVITY=$(date +%s)
NO_PROGRESS_THRESHOLD=30  # seconds

check_progress() {
    local current_time=$(date +%s)
    local idle_time=$((current_time - LAST_ACTIVITY))
    
    if [ $idle_time -gt $NO_PROGRESS_THRESHOLD ]; then
        echo -e "${YELLOW}⏰ No activity for ${idle_time}s${RESET}" >&2
        if [ -x "$HOOKS_DIR/axiom-intervene" ]; then
            "$HOOKS_DIR/axiom-intervene" "NO_PROGRESS" "$idle_time" &
        fi
        LAST_ACTIVITY=$current_time  # Reset to avoid spam
    fi
}

# Main streaming loop
(
    # Stream existing content first
    cat "$LOG_FILE" | while IFS= read -r line; do
        detect_patterns "$line"
        LAST_ACTIVITY=$(date +%s)
    done
    
    # Then tail for new content
    tail -f "$LOG_FILE" | while IFS= read -r line; do
        detect_patterns "$line"
        LAST_ACTIVITY=$(date +%s)
    done
) &

MONITOR_PID=$!
echo $MONITOR_PID > "$PID_FILE"

# Progress checker in background
(
    while kill -0 $MONITOR_PID 2>/dev/null; do
        sleep 5
        check_progress
    done
) &

# Also monitor for specific events in the event stream
if [ "$TOOL_NAME" = "axiom_mcp_spawn" ]; then
    # Extract task metadata
    TASK_ID=$(echo "$TOOL_RESULT" | jq -r '.taskId // empty' 2>/dev/null)
    
    if [ -n "$TASK_ID" ]; then
        echo -e "${CYAN}[AXIOM-MONITOR] Tracking task: $TASK_ID${RESET}" >&2
        
        # Create a task-specific view
        (
            sleep 2  # Give the task time to start
            tail -f "$LOG_FILE" | grep "$TASK_ID" | while IFS= read -r line; do
                EVENT_TYPE=$(echo "$line" | jq -r '.event // empty' 2>/dev/null)
                case "$EVENT_TYPE" in
                    "task_start")
                        echo -e "${GREEN}▶️  Task Started${RESET}" >&2
                        ;;
                    "task_complete")
                        echo -e "${GREEN}✅ Task Complete${RESET}" >&2
                        ;;
                    "task_failed")
                        echo -e "${RED}❌ Task Failed${RESET}" >&2
                        ;;
                esac
            done
        ) &
    fi
fi

# Summary statistics updater
(
    while kill -0 $MONITOR_PID 2>/dev/null; do
        sleep 10
        
        # Count events in the last minute
        RECENT_EVENTS=$(tail -n 100 "$LOG_FILE" | wc -l)
        FILES_CREATED=$(tail -n 100 "$LOG_FILE" | grep -c "file_created" || true)
        ERRORS=$(tail -n 100 "$LOG_FILE" | grep -c "error" || true)
        
        if [ $RECENT_EVENTS -gt 0 ]; then
            echo -e "${CYAN}📊 Last minute: $RECENT_EVENTS events, $FILES_CREATED files, $ERRORS errors${RESET}" >&2
        fi
    done
) &

echo -e "${GREEN}[AXIOM-MONITOR] Stream monitor started (PID: $MONITOR_PID)${RESET}" >&2

# Keep the hook alive briefly to ensure background processes start
sleep 1

exit 0