# Axiom MCP Troubleshooting Guide

## Quick Fixes for Common Issues

### 🔴 "Error: No such tool available: axiom_spawn"

**Symptom**: Tool calls return "No such tool available"

**Solutions**:
1. **Check MCP settings** - Ensure Axiom is configured:
   ```json
   {
     "mcpServers": {
       "axiom-mcp": {
         "command": "node",
         "args": ["/absolute/path/to/axiom-mcp/dist-v4/index.js"]
       }
     }
   }
   ```

2. **Verify server is running**:
   ```bash
   ps aux | grep axiom | grep -v grep
   # Should show: node /path/to/axiom-mcp/dist-v4/index.js
   ```

3. **Restart Claude Code** - MCP servers load on startup

4. **Check build**:
   ```bash
   cd axiom-mcp
   npm run build:v4
   ls -la dist-v4/index.js  # Should exist and be executable
   ```

### 🔴 "Task must specify concrete action"

**Symptom**: Validation hook rejects your prompt

**Problem**: Using analysis/research words instead of action verbs

**Fix**: 
```javascript
// ❌ WRONG
axiom_spawn({ prompt: "analyze authentication options" })
axiom_spawn({ prompt: "research best practices for API" })
axiom_spawn({ prompt: "look into database options" })

// ✅ CORRECT
axiom_spawn({ prompt: "create auth.js with JWT authentication" })
axiom_spawn({ prompt: "implement REST API with Express" })
axiom_spawn({ prompt: "build PostgreSQL schema for users" })
```

### 🔴 Task Stuck at Claude Trust Prompt

**Symptom**: Task shows RUNNING but no progress, output shows trust dialog

**Problem**: Claude asks if you trust the directory

**Solutions**:

1. **Pre-trust the directory** (Recommended):
   ```bash
   cd /your/project
   claude  # Run manually
   # Select "Yes, proceed" when prompted
   exit
   # Now Axiom tasks work in this directory
   ```

2. **Use axiom_send to answer**:
   ```javascript
   // If stuck at trust prompt
   axiom_send({ 
     taskId: "task-123", 
     message: "y\n"  // or "1\n" depending on prompt
   })
   ```

3. **Set environment** (Experimental):
   ```json
   {
     "mcpServers": {
       "axiom-mcp": {
         "env": {
           "AXIOM_TRUST_MODE": "auto"
         }
       }
     }
   }
   ```

### 🔴 "Not connected" When Checking Status

**Symptom**: `axiom_status()` returns "Not connected"

**Problem**: MCP server connection issue

**Debug Steps**:

1. **Check logs**:
   ```bash
   # Find latest log
   ls -la axiom-mcp/logs-v4/debug-*.log | tail -1
   # View it
   tail -100 /path/to/latest-debug.log
   ```

2. **Verify process**:
   ```bash
   # Check if server crashed
   ps aux | grep "axiom.*index.js" | grep -v grep
   ```

3. **Test with inspector**:
   ```bash
   npx @modelcontextprotocol/inspector dist-v4/index.js
   ```

### 🔴 No Real-Time Output

**Symptom**: Task runs but you don't see output

**Problem**: `verboseMasterMode` not enabled

**Fix**:
```javascript
// Always use verbose mode to see what's happening
axiom_spawn({
  prompt: "create server.js",
  verboseMasterMode: true  // ← THIS IS REQUIRED
})
```

### 🔴 Task Completes But No Files Created

**Symptom**: Task shows COMPLETE but no files on disk

**Debug**:

1. **Check output for errors**:
   ```javascript
   axiom_output({ taskId: "task-123" })
   ```

2. **Look for permission issues**:
   ```bash
   # Check directory permissions
   ls -la .
   # Should show write permissions for your user
   ```

3. **Verify working directory**:
   ```javascript
   // Task might be creating files elsewhere
   axiom_spawn({
     prompt: "pwd && create test.txt with 'hello'",
     verboseMasterMode: true
   })
   ```

### 🔴 "Process exited with code 1"

**Symptom**: Task fails immediately

**Common Causes**:

1. **Claude not installed**:
   ```bash
   which claude  # Should show path
   # If not, install Claude CLI
   ```

2. **Environment issues**:
   ```bash
   # Test Claude directly
   claude --version
   ```

3. **Working directory doesn't exist**:
   ```javascript
   // Check current directory in logs
   axiom_output({ taskId: "failed-task-id" })
   ```

### 🔴 Parallel Tasks Interfering

**Symptom**: Multiple tasks creating same files or conflicting

**Solution**: Use unique file names or directories:
```javascript
// Give each task unique scope
axiom_spawn({
  prompt: "create auth-jwt.js for JWT authentication",
  spawnPattern: "parallel",
  spawnCount: 3
})
// Workers will create: auth-jwt-1.js, auth-jwt-2.js, auth-jwt-3.js
```

### 🔴 High Memory/CPU Usage

**Symptom**: System slows down with multiple tasks

**Solutions**:

1. **Limit concurrent tasks**:
   ```json
   {
     "mcpServers": {
       "axiom-mcp": {
         "env": {
           "AXIOM_MAX_TASKS": "5"  // Default is 10
         }
       }
     }
   }
   ```

2. **Disable verbose mode for large operations**:
   ```javascript
   axiom_spawn({
     prompt: "process 1000 files",
     verboseMasterMode: false  // Reduce overhead
   })
   ```

3. **Kill stuck tasks**:
   ```javascript
   // Check what's running
   axiom_status({})
   // Kill specific task
   axiom_interrupt({ taskId: "memory-hog-task" })
   ```

## Advanced Debugging

### Enable Trace Logging

```bash
# Maximum verbosity
export AXIOM_LOG_LEVEL=TRACE

# Or in MCP settings:
{
  "mcpServers": {
    "axiom-mcp": {
      "env": {
        "AXIOM_LOG_LEVEL": "TRACE"
      }
    }
  }
}
```

### Read Debug Resources

```javascript
// System status
Read("axiom://status")

// Recent logs
Read("axiom://logs")

// Debug log file
Read("axiom://debug")

// Help documentation
Read("axiom://help")
```

### Check Database

```bash
# Axiom stores history in SQLite
sqlite3 axiom-mcp/axiom-conversations.db
.tables
SELECT * FROM tasks ORDER BY created_at DESC LIMIT 5;
```

### Pattern Detection Issues

If Axiom isn't catching planning:

1. **Check patterns in logs**:
   ```bash
   grep "Pattern detected" logs-v4/debug-*.log
   ```

2. **Verify hook is active**:
   ```javascript
   // Should show intervention-hook in list
   Read("axiom://status")
   ```

3. **Test pattern directly**:
   ```javascript
   axiom_spawn({
     prompt: "I'll analyze the requirements for a web scraper",
     verboseMasterMode: true
   })
   // Should interrupt immediately
   ```

## Emergency Procedures

### Kill All Axiom Tasks

```bash
# Nuclear option - kills all Claude instances
pkill -f "claude"

# Or more targeted
ps aux | grep axiom | grep PTY | awk '{print $2}' | xargs kill
```

### Reset Axiom State

```bash
# Stop all processes
pkill -f "axiom-mcp"

# Clear logs (optional)
rm axiom-mcp/logs-v4/*

# Clear database (optional - loses history)
rm axiom-mcp/axiom-conversations.db

# Rebuild
cd axiom-mcp
npm run build:v4

# Restart Claude Code
```

### Check System Resources

```bash
# Memory usage
free -h

# CPU usage
top -p $(pgrep -f axiom | tr '\n' ',')

# Disk space
df -h .

# Open files
lsof | grep axiom | wc -l
```

## Getting Help

### 1. Check Logs First
```bash
tail -100 axiom-mcp/logs-v4/debug-*.log | grep ERROR
```

### 2. Use MCP Inspector
```bash
npx @modelcontextprotocol/inspector dist-v4/index.js
# Test tools interactively
```

### 3. GitHub Issues
https://github.com/pfin/nova-mcp/issues

### 4. Common Fix Checklist
- [ ] Claude Code restarted after config change
- [ ] Absolute paths in MCP settings
- [ ] npm run build:v4 completed successfully  
- [ ] Directory is pre-trusted with Claude
- [ ] verboseMasterMode enabled
- [ ] Using action verbs in prompts
- [ ] Not too many concurrent tasks

## Prevention Tips

1. **Always use absolute paths** in MCP configuration
2. **Pre-trust project directories** before using Axiom
3. **Enable verbose mode** during development
4. **Start with single tasks** before trying parallel
5. **Monitor system resources** with many tasks
6. **Check logs immediately** when issues occur
7. **Use concrete action verbs** in all prompts
8. **Keep Claude Code updated** for latest MCP support

Remember: Most issues are configuration-related. When in doubt, restart Claude Code and check the logs!