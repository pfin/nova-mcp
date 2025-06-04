# Nova Memory Setup

This is a customized version of Basic Memory configured for the Nova project.

## Installation

The server is called `nova-memory` to distinguish it from the standard `basic-memory` installation.

Since this uses Python 3.12+, you can run it directly with the wrapper script:

```bash
./run-mcp.sh
```

## Configuration for Claude Code

Add to Claude Code with:

```bash
claude mcp add nova-memory /path/to/nova-mcp/basic-memory/run-mcp.sh -s user
```

The wrapper script uses the installed basic-memory package with the nova project:
```bash
uvx basic-memory --project nova mcp
```

This requires that:
1. You have basic-memory installed (`pip install basic-memory` or `uv tool install basic-memory`)
2. The nova project is configured in `~/.basic-memory/config.json`

## Differences from Basic Memory

- Server name is `nova-memory` to avoid conflicts
- Project name is "nova" 
- Configured specifically for Nova project at `/home/peter/nova_memory`
- Uses wrapper script for easy execution without installation