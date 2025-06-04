# Nova Memory Setup

This is a customized version of Basic Memory configured for the Nova project.

## Installation

Since this uses Python 3.12+, you can run it directly with the wrapper script:

```bash
./run-mcp.sh
```

## Configuration for Claude Code

Add to Claude Code with:

```bash
claude mcp add nova-memory /path/to/nova-mcp/basic-memory/run-mcp.sh -s user
```

## Differences from Basic Memory

- Renamed to `nova-memory` to avoid conflicts
- Configured specifically for Nova project at `/home/peter/nova_memory`
- Uses wrapper script for easy execution without installation