#!/bin/bash
# Axiom MCP Hook: Auto-format Code
# Automatically formats code after edits based on file type

set -e

# Configuration
AXIOM_ROOT="/home/peter/nova-mcp/axiom-mcp"
LOG_FILE="$AXIOM_ROOT/logs-v3/formatting.log"

# Helper function for logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Extract file path from tool result
FILE_PATH=$(echo "$TOOL_RESULT" | jq -r '.file_path // .path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
    # Try to extract from content
    FILE_PATH=$(echo "$TOOL_RESULT" | grep -oE '/[^ ]+\.(ts|tsx|js|jsx|py|rs|go|md|json)' | head -1)
fi

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
    exit 0  # No file to format
fi

log "Formatting: $FILE_PATH"

# Format based on file extension
case "$FILE_PATH" in
    *.ts|*.tsx|*.js|*.jsx)
        # TypeScript/JavaScript - use prettier if available
        if command -v npx >/dev/null 2>&1 && [ -f "$(dirname "$FILE_PATH")/package.json" ]; then
            if npx prettier --write "$FILE_PATH" 2>/dev/null; then
                log "Formatted with Prettier: $FILE_PATH"
                echo "[AXIOM-FORMAT] Formatted: $(basename "$FILE_PATH")" >&2
            fi
        fi
        ;;
        
    *.py)
        # Python - use black if available
        if command -v black >/dev/null 2>&1; then
            if black "$FILE_PATH" 2>/dev/null; then
                log "Formatted with Black: $FILE_PATH"
                echo "[AXIOM-FORMAT] Formatted: $(basename "$FILE_PATH")" >&2
            fi
        elif command -v autopep8 >/dev/null 2>&1; then
            if autopep8 --in-place "$FILE_PATH" 2>/dev/null; then
                log "Formatted with autopep8: $FILE_PATH"
                echo "[AXIOM-FORMAT] Formatted: $(basename "$FILE_PATH")" >&2
            fi
        fi
        ;;
        
    *.rs)
        # Rust - use rustfmt if available
        if command -v rustfmt >/dev/null 2>&1; then
            if rustfmt "$FILE_PATH" 2>/dev/null; then
                log "Formatted with rustfmt: $FILE_PATH"
                echo "[AXIOM-FORMAT] Formatted: $(basename "$FILE_PATH")" >&2
            fi
        fi
        ;;
        
    *.go)
        # Go - use gofmt if available
        if command -v gofmt >/dev/null 2>&1; then
            if gofmt -w "$FILE_PATH" 2>/dev/null; then
                log "Formatted with gofmt: $FILE_PATH"
                echo "[AXIOM-FORMAT] Formatted: $(basename "$FILE_PATH")" >&2
            fi
        fi
        ;;
        
    *.json)
        # JSON - use jq if available
        if command -v jq >/dev/null 2>&1; then
            if jq . "$FILE_PATH" > "$FILE_PATH.tmp" 2>/dev/null && mv "$FILE_PATH.tmp" "$FILE_PATH"; then
                log "Formatted with jq: $FILE_PATH"
                echo "[AXIOM-FORMAT] Formatted: $(basename "$FILE_PATH")" >&2
            fi
        fi
        ;;
        
    *.md)
        # Markdown - use prettier if available
        if command -v npx >/dev/null 2>&1; then
            if npx prettier --write "$FILE_PATH" --parser markdown 2>/dev/null; then
                log "Formatted with Prettier: $FILE_PATH"
                echo "[AXIOM-FORMAT] Formatted: $(basename "$FILE_PATH")" >&2
            fi
        fi
        ;;
esac

# Check for common issues after formatting
if [ -f "$FILE_PATH" ]; then
    # Check for console.log in production code
    if [[ ! "$FILE_PATH" =~ test ]] && [[ ! "$FILE_PATH" =~ spec ]]; then
        if grep -q "console\.\(log\|error\|warn\)" "$FILE_PATH" 2>/dev/null; then
            echo "[AXIOM-FORMAT] ⚠️  Warning: console statements found in: $(basename "$FILE_PATH")" >&2
            log "WARNING: console statements in $FILE_PATH"
        fi
    fi
    
    # Check for TODO/FIXME
    TODO_COUNT=$(grep -c "TODO\|FIXME" "$FILE_PATH" 2>/dev/null || echo "0")
    if [ "$TODO_COUNT" -gt 0 ]; then
        echo "[AXIOM-FORMAT] ⚠️  Found $TODO_COUNT TODO/FIXME in: $(basename "$FILE_PATH")" >&2
        log "WARNING: $TODO_COUNT TODOs in $FILE_PATH"
    fi
fi

exit 0