# Axiom MCP v3 Tool Catalog

## Core Execution Tools

### 1. axiom_mcp_spawn ✅
- **Purpose**: Execute tasks that spawn multiple subtasks with recursive capabilities
- **Status**: Implemented (needs response format fix)
- **Key Features**: 
  - Parallel/sequential/recursive execution patterns
  - Verbose master mode for real-time streaming
  - Intervention system integration

### 2. axiom_test_v3 ✅
- **Purpose**: Test PTY executor without timeouts
- **Status**: Implemented (needs response format fix)
- **Use Case**: Quick testing of execution system

## Observability Tools

### 3. axiom_mcp_observe ✅
- **Purpose**: Observe active conversations and execution progress
- **Status**: Implemented (needs response format fix)
- **Modes**:
  - `all`: Show all active conversations
  - `tree`: Show conversation tree for specific ID
  - `recent`: Show recent actions
  - `live`: Real-time monitoring

### 4. axiom_mcp_principles ✅
- **Purpose**: Manage and enforce universal coding principles
- **Status**: Implemented (needs response format fix)
- **Actions**:
  - `list`: Show all principles
  - `check`: Validate code against principles
  - `enforce`: Apply principles to code
  - `verify`: Check conversation compliance

## Missing Critical Tools (Need Implementation)

### 5. axiom_logs 🔴
- **Purpose**: Access event logs and execution history
- **Required Features**:
  - Query logs by time range
  - Filter by conversation ID
  - Search by pattern
  - Export logs

### 6. axiom_stats 🔴
- **Purpose**: Get system statistics and performance metrics
- **Required Features**:
  - Execution success rates
  - Intervention statistics
  - Database size and performance
  - Active conversation count

### 7. axiom_interventions 🔴
- **Purpose**: View and manage intervention history
- **Required Features**:
  - List all interventions
  - Filter by type (TODO, planning timeout, progress)
  - Success/failure rates
  - Manual intervention triggers

### 8. axiom_database 🔴
- **Purpose**: Query conversation database directly
- **Required Features**:
  - Search conversations
  - View action history
  - Export conversation data
  - Database maintenance

### 9. axiom_config 🔴
- **Purpose**: Manage system configuration
- **Required Features**:
  - View current settings
  - Update intervention thresholds
  - Enable/disable features
  - Export/import config

### 10. axiom_stream_viewer 🔴
- **Purpose**: Access raw PTY output streams
- **Required Features**:
  - View live streams
  - Search historical streams
  - Parse stream events
  - Export stream data

### 11. axiom_workspace 🔴
- **Purpose**: Manage execution workspace
- **Required Features**:
  - List created files
  - View file diffs
  - Clean workspace
  - Backup/restore

### 12. axiom_health 🔴
- **Purpose**: System health check and diagnostics
- **Required Features**:
  - Check all components
  - Verify database integrity
  - Test executors
  - Performance benchmarks

## Advanced Tools (Future)

### 13. axiom_mcts_control 🔵
- **Purpose**: Control MCTS optimization
- **Features**:
  - View decision trees
  - Adjust parameters
  - Force path selection

### 14. axiom_parallel_monitor 🔵
- **Purpose**: Monitor parallel executions
- **Features**:
  - View worker status
  - Resource allocation
  - Queue management

### 15. axiom_rule_editor 🔵
- **Purpose**: Edit intervention rules
- **Features**:
  - Add custom rules
  - Test rule patterns
  - Rule performance stats

## Tool Implementation Priority

### Phase 1 (Critical - This Week)
1. Fix response format for existing 4 tools
2. Implement `axiom_logs` - Essential for debugging
3. Implement `axiom_stats` - Need visibility into system
4. Implement `axiom_interventions` - Core feature visibility

### Phase 2 (Important - Next Week)
5. Implement `axiom_database` - Direct data access
6. Implement `axiom_stream_viewer` - Stream debugging
7. Implement `axiom_health` - System diagnostics

### Phase 3 (Nice to Have - Month 2)
8. Implement `axiom_config` - Runtime configuration
9. Implement `axiom_workspace` - File management
10. Advanced tools as needed

## Tool Response Format Standard

ALL tools MUST return this format:
```typescript
{
  result: {
    content: [{
      type: 'text',
      text: 'Tool output here'
    }],
    structuredContent?: {
      // Optional structured data
    },
    isError?: boolean
  }
}
```

## Tool Input Schema Standard

ALL tools MUST have:
```typescript
{
  name: 'axiom_tool_name',
  title: 'Human Readable Title',
  description: 'What this tool does',
  inputSchema: {
    type: 'object',
    properties: { ... },
    required: [...],
    additionalProperties: false,
    title: 'SchemaTitle'
  }
}
```