#!/usr/bin/env python3
"""Test that hooks are working"""

import json
import sys
import os
from datetime import datetime

LOG_FILE = os.path.expanduser("~/nova-mcp/.claude/hooks/test.log")

# Create directory if needed
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

# Log that hook was called
with open(LOG_FILE, "a") as f:
    f.write(f"\n[{datetime.now().isoformat()}] Hook called!\n")
    f.write(f"Args: {sys.argv}\n")
    f.write(f"Environment:\n")
    for key in sorted(os.environ.keys()):
        if any(x in key.lower() for x in ['hook', 'tool', 'claude', 'session']):
            f.write(f"  {key}={os.environ[key]}\n")
    
    # Try to read stdin
    try:
        payload = json.load(sys.stdin)
        f.write(f"Payload: {json.dumps(payload, indent=2)}\n")
    except:
        f.write("No JSON payload on stdin\n")

print("Hook executed successfully")
sys.exit(0)