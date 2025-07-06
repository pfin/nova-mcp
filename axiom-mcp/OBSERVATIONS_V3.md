# Axiom MCP V3 Observations & Development Guide

## Current State (2025-01-06 17:21)

### ✅ What's Working
1. **Task Decomposition**: Successfully breaks down complex tasks into logical subtasks
2. **Parent-Child Relationships**: Proper task tree structure with IDs and relationships
3. **Task Type Detection**: Correctly identifies task types (general, implementation, etc.)
4. **MCP Tool Integration**: axiom_mcp_spawn and axiom_mcp_status tools are callable
5. **No Authentication**: Successfully removed all auth/security scanning per user request

### ❌ Critical Issues
1. **Execution Gap**: Tasks are created but NEVER executed
   - PTY executor exists but isn't connected to task runner
   - All tasks remain in "pending" state
   - Parent shows "completed" with 0% progress
   
2. **No File Output**: Despite promises to write code, no files are created
   - factorial.py was never written
   - No Python or TypeScript files generated
   
3. **Missing Execution Loop**: After spawning tasks, nothing triggers their execution

### 🔍 Key Observations

#### From Baseline Test (factorial.py)
- Simple task spawned in 8 seconds
- Created 1 subtask successfully
- Task marked complete but no file created
- PTY executor never invoked

#### From Complex Test (Web Scraper)
- Excellent decomposition into 4 logical subtasks
- Properly separated Python and TypeScript components
- All 4 tasks remain pending
- No attempt to execute any subtask

### 🎯 Immediate Priorities

1. **Fix Claude CLI Execution** (HIGHEST PRIORITY)
   - Current issue: Uses `claude --print` which asks for permission
   - Line 78: `const claudeArgs = ['--print'];`
   - Need to remove `--print` flag to enable direct execution
   - PTY executor is connected but hampered by permission prompts

2. **Add Execution Verification**
   - Check if files were created
   - Verify code was written
   - Fail loudly if only research happened

3. **Fix Progress Tracking**
   - Update task status during execution
   - Show real progress percentages
   - Mark tasks complete only after verification

### 🏗️ Architecture Insights

#### Current Flow
```
User Request → axiom_mcp_spawn → Task Decomposition → Task Tree → ❌ STOP
```

#### Needed Flow
```
User Request → axiom_mcp_spawn → Task Decomposition → Task Tree → PTY Execution → File Verification → Status Update
```

### 📊 Development Metrics
- **Tests Run**: 2
- **Success Rate**: 0% (no actual execution)
- **Files Created**: 0
- **Tasks Executed**: 0/5

### 🚀 Next Steps
1. Open axiom-mcp-spawn.ts and find task creation code
2. Add execution loop with PTY executor
3. Test with simple factorial task
4. Verify file creation
5. Move to observability system

### 💡 Development Philosophy
> "Execution over planning. If it doesn't create files, it's not working."

---

## Session Log

### 17:21 - Initial V3 Test
- Loaded Axiom MCP v3
- Tested with factorial.py task
- Discovered execution gap

### 17:22 - Complex Test
- Tested Python + TypeScript task
- Confirmed execution gap persists
- Good decomposition, zero execution

### 17:23 - Created This File
- Starting observation-driven development
- Will update as we progress

### 17:24 - Fixed Claude CLI Execution
- Identified issue: `--print` flag causes permission prompts
- Fixed by removing `--print` flag from claudeArgs
- Rebuilt v3 with fix
- Ready to test execution

### 17:30 - Built Observability System
- Created SQLite conversation database
- Implemented stream parser for PTY output
- Added axiom_mcp_observe tool with modes:
  - `all` - show all active conversations
  - `tree` - show specific conversation tree
  - `recent` - show last N actions
  - `live` - placeholder for future streaming
- Integrated database with spawn tool
- Real-time stream parsing and storage
- Parent-child relationship tracking
- Built and ready to test

---

## Observability System Design

### Requirements (Per User Request)
1. **Multiple Conversations**: Track N conversations (not hardcoded to 3)
2. **Arbitrary Depth**: Support parent-child relationships at any depth
3. **Flexible Observation**:
   - Master view (all conversations)
   - Focused view (specific branch)
   - Last N actions view
4. **Database Storage**: Use SQLite, not LLM context
5. **Stream Parsing**: Convert PTY output to structured data

### Proposed SQLite Schema
```sql
-- Core tables
conversations (id, parent_id, started_at, status, depth, prompt, task_type)
actions (id, conversation_id, timestamp, type, content, metadata)
streams (id, conversation_id, chunk, parsed_data, timestamp)
observations (id, name, filter_json, created_at)

-- Indexes for performance
idx_conversations_parent (parent_id)
idx_actions_conversation (conversation_id, timestamp)
idx_streams_conversation (conversation_id, timestamp)
```

### Component Design
- **ConversationDB**: SQLite wrapper with async operations
- **StreamParser**: Parse PTY chunks into structured events
- **ConversationTracker**: Manage parent-child relationships
- **ObservationEngine**: Query interface for different views
- **RealtimeEmitter**: Push updates to observers