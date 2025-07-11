#!/usr/bin/env python3
"""
Claude Code Notification Hook
Detects when Claude is ready for input and logs state
"""

import json
import sys
import os
from datetime import datetime

# Log file for debugging
LOG_FILE = os.path.expanduser("~/nova-mcp/.claude/hooks/notification.log")

def log_message(message):
    """Log a message with timestamp"""
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(f"[{datetime.now().isoformat()}] {message}\n")

def main():
    try:
        # Read the payload from stdin
        payload = json.load(sys.stdin)
        
        # Extract message content
        message = payload.get("message", "")
        
        # Log the notification
        log_message(f"Notification received: {message}")
        
        # Check if Claude is waiting for input
        if any(phrase in message.lower() for phrase in [
            "waiting for",
            "ready for",
            "awaiting",
            "expecting",
            "provide input",
            "enter your"
        ]):
            log_message("CLAUDE IS READY FOR INPUT!")
            
            # Write a marker file that axiom can check
            marker_file = os.path.expanduser("~/nova-mcp/.claude/ready-for-input")
            with open(marker_file, "w") as f:
                f.write(f"{datetime.now().isoformat()}\n{message}")
        
        # Check if Claude is processing
        if any(phrase in message.lower() for phrase in [
            "processing",
            "thinking",
            "analyzing",
            "working on",
            "generating"
        ]):
            log_message("Claude is processing...")
            
            # Remove ready marker if it exists
            marker_file = os.path.expanduser("~/nova-mcp/.claude/ready-for-input")
            if os.path.exists(marker_file):
                os.remove(marker_file)
        
        # Always exit 0 to not block
        sys.exit(0)
        
    except Exception as e:
        log_message(f"Error in notification hook: {e}")
        # Exit 0 even on error to not block Claude
        sys.exit(0)

if __name__ == "__main__":
    main()