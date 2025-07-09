# Claude Code MCP Setup Guide for Axiom

Date: 2025-07-08

## Problem

Axiom MCP tools are not accessible from Claude Code even though the server is running.

## Solution

1. **Add axiom-mcp to Claude Code's MCP configuration**
   
   Edit `~/.claude/settings.json` and add the axiom-mcp server:

   ```json
   {
     "model": "opus",
     "mcpServers": {
       // ... existing servers ...
       "axiom-mcp": {
         "command": "node",
         "args": ["/home/peter/nova-mcp/axiom-mcp/dist-v4/index.js"],
         "env": {
           "AXIOM_LOG_LEVEL": "INFO",
           "AXIOM_DB_PATH": "/home/peter/nova-mcp/axiom-mcp/axiom-v4.db"
         }
       }
     }
   }
   ```

2. **Restart Claude Code**
   - MCP servers are loaded when Claude Code starts
   - After editing settings.json, you MUST restart Claude Code
   - Close all Claude Code windows/sessions and start fresh

3. **Tool Naming Convention**
   
   Once properly configured, axiom tools will be available with this pattern:
   - `mcp__axiom-mcp__axiom_spawn`
   - `mcp__axiom-mcp__axiom_send`
   - `mcp__axiom-mcp__axiom_status`
   - `mcp__axiom-mcp__axiom_output`
   - `mcp__axiom-mcp__axiom_interrupt`
   - `mcp__axiom-mcp__axiom_claude_orchestrate`
   - `mcp__axiom-mcp__axiom_claude_orchestrate_proper`
   - `mcp__axiom-mcp__axiom_orthogonal_decompose`

## Configuration Files

- **Claude Code MCP Config**: `~/.claude/settings.json`
- **Claude Code Permissions**: `~/.claude/settings.local.json`
- **Cline MCP Config** (VSCode): `~/.vscode-server/data/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

## Verification

After restart, test with:
```python
# In Claude Code
mcp__axiom-mcp__axiom_spawn(prompt="echo 'Axiom MCP is working!'")
```

## Troubleshooting

1. **Check if server is in config**:
   ```bash
   cat ~/.claude/settings.json | jq '.mcpServers."axiom-mcp"'
   ```

2. **Verify server is executable**:
   ```bash
   node /home/peter/nova-mcp/axiom-mcp/dist-v4/index.js
   # Should see: "Axiom MCP Server v4 running on stdio"
   ```

3. **Check permissions**:
   ```bash
   grep "mcp__axiom-mcp" ~/.claude/settings.local.json
   ```

4. **Server not loading?**
   - Ensure path is absolute, not relative
   - Check file exists and is executable
   - Look for errors in Claude Code logs

## Notes

- The server name in settings.json ("axiom-mcp") becomes part of the tool prefix
- Different from the server's internal name ("axiom-mcp-v4")
- Permissions are auto-added to settings.local.json when tools are first used