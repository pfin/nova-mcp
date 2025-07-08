# Axiom MCP v3 Complete Component Catalog

## Overview
This document catalogs EVERY component, function, variable, and prompt in Axiom MCP v3, with analysis of what should be exposed as MCP tools.

## Current MCP Tools (7 Total)

### 1. axiom_mcp_spawn ✅
- **Location**: `src-v3/tools/axiom-mcp-spawn.ts`
- **Purpose**: Execute tasks with recursive subtasks
- **Key Functions**:
  - `handleAxiomMcpSpawn()` - Main handler
  - `executeWithPty()` - PTY execution
  - `spawnSubtasks()` - Task decomposition
  - `captureFileState()` - File monitoring
- **Should be tool**: YES (already is)

### 2. axiom_test_v3 ✅
- **Location**: `src-v3/tools/axiom-test-v3.ts`
- **Purpose**: Test PTY executor
- **Key Functions**:
  - `handleAxiomTestV3()` - Main handler
- **Should be tool**: YES (already is)

### 3. axiom_mcp_observe ✅
- **Location**: `src-v3/tools/axiom-mcp-observe.ts`
- **Purpose**: Observe conversations and progress
- **Key Functions**:
  - `handleAxiomMcpObserve()` - Main handler
  - `getChildCount()` - Tree navigation
  - `getMostRecentAction()` - Action history
  - `buildTreeView()` - Visualization
- **Should be tool**: YES (already is)

### 4. axiom_mcp_principles ✅
- **Location**: `src-v3/tools/axiom-mcp-principles.ts`
- **Purpose**: Manage universal principles
- **Key Functions**:
  - `handleAxiomMcpPrinciples()` - Main handler
- **Should be tool**: YES (already is)

### 5. axiom_mcp_logs ✅ (NEW)
- **Location**: `src-v3/tools/axiom-mcp-logs.ts`
- **Purpose**: View and search logs
- **Should be tool**: YES (already is)

### 6. axiom_mcp_settings ✅ (NEW)
- **Location**: `src-v3/tools/axiom-mcp-settings.ts`
- **Purpose**: Manage runtime settings
- **Should be tool**: YES (already is)

### 7. axiom_mcp_status ✅ (NEW)
- **Location**: `src-v3/tools/axiom-mcp-status.ts`
- **Purpose**: System status and metrics
- **Should be tool**: YES (already is)

## Core Executors (Internal Only)

### PtyExecutor
- **Location**: `src-v3/executors/pty-executor.ts`
- **Key Functions**:
  - `execute()` - Main execution
  - `executeRaw()` - Raw PTY spawn
  - `interrupt()` - Send signals
  - `write()` - Write to PTY
  - `waitForComplete()` - Completion detection
- **Variables**:
  - `DEFAULT_TIMEOUT = 300000` (5 minutes)
  - `HEARTBEAT_INTERVAL = 1000` (1 second)
- **Should be tool**: NO (core infrastructure)

### SdkExecutor
- **Location**: `src-v3/executors/sdk-executor.ts`
- **Status**: UNUSED (could enable streaming)
- **Key Functions**:
  - `execute()` - SDK-based execution
  - `stream()` - Streaming responses
- **Should be tool**: NO (but should be connected)

### GuidedExecutor
- **Location**: `src-v3/executors/guided-executor.ts`
- **Purpose**: Step-by-step execution with intervention
- **Key Functions**:
  - `executeGuidedPrompt()` - Main execution
  - `generateSteps()` - Break down tasks
  - `executeStep()` - Execute single step
  - `requestUserGuidance()` - Get user input
- **Should be tool**: YES - as `axiom_guided_execute`

## Database Components

### ConversationDB
- **Location**: `src-v3/database/conversation-db.ts`
- **Tables**:
  - `conversations` - Task hierarchy
  - `actions` - Events and outcomes
  - `streams` - Raw output data
  - `observation_views` - Saved queries
- **Key Functions**:
  - `createConversation()` - New tasks
  - `addAction()` - Log events
  - `getActiveConversations()` - Query active
  - `getConversationTree()` - Tree structure
  - `exportConversation()` - Export data
- **Should be tool**: YES - as `axiom_db_query`

### DatabaseTools
- **Location**: `src-v3/tools/database-tools.ts`
- **Functions**:
  - `handleDatabaseQuery()` - Query wrapper
  - `handleDatabaseExport()` - Export wrapper
  - `handleDatabaseStats()` - Stats wrapper
- **Should be tool**: YES - expose these functions

## Parsers and Verifiers

### StreamParser
- **Location**: `src-v3/parsers/stream-parser.ts`
- **Purpose**: Extract events from PTY output
- **Key Functions**:
  - `parseChunk()` - Parse output chunks
  - `detectEvent()` - Identify event types
  - `extractContent()` - Extract messages
- **Regular Expressions**:
  - File creation: `/(?:created?|wrote|generated).*(\.(?:js|ts|py|java|cpp|c|h|hpp|go|rs|rb|php|swift|kt|scala|r|m|mm|sh|bash|zsh|fish|ps1|bat|cmd))/i`
  - Claude messages: `/^(Human|Assistant):\s*/`
  - Error patterns: `/error:|failed:|exception:|traceback/i`
- **Should be tool**: NO (internal parser)

### RuleVerifier
- **Location**: `src-v3/verifiers/rule-verifier.ts`
- **Purpose**: Verify code against principles
- **Key Functions**:
  - `verifyCode()` - Check compliance
  - `verifyInRealTime()` - Live verification
  - `applyRule()` - Apply single rule
- **Should be tool**: YES - as `axiom_verify_code`

## Managers

### StatusManager
- **Location**: `src-v3/managers/status-manager.ts`
- **Purpose**: Track task status
- **Key Functions**:
  - `createTask()` - New task
  - `updateTaskStatus()` - Status changes
  - `getTasksByStatus()` - Query tasks
- **Should be tool**: Partially (through axiom_mcp_status)

### MasterController
- **Location**: `src-v3/controllers/master-controller.ts`
- **Purpose**: Orchestrate complex workflows
- **Key Functions**:
  - `orchestrateWorkflow()` - Main orchestration
  - `createExecutionPlan()` - Plan creation
  - `executePhase()` - Phase execution
  - `monitorProgress()` - Progress tracking
- **Should be tool**: YES - as `axiom_orchestrate`

### PromptConfigManager
- **Location**: `src-v3/config/prompt-config-manager.ts`
- **Purpose**: Manage dynamic prompts
- **Key Functions**:
  - `loadConfig()` - Load prompts
  - `getPrompt()` - Get specific prompt
  - `updatePrompt()` - Runtime updates
  - `validatePrompt()` - Validation
- **Should be tool**: YES - as `axiom_manage_prompts`

## System Components

### EventBus
- **Location**: `src-v3/core/event-bus.ts`
- **Purpose**: Central event system
- **Key Functions**:
  - `emit()` - Emit events
  - `on()` - Listen to events
  - `logEvent()` - Log to file
  - `getStats()` - Event statistics
- **Event Types**:
  - TASK_START, TASK_COMPLETE, TASK_ERROR
  - FILE_CREATED, FILE_MODIFIED
  - INTERVENTION_TRIGGERED
  - TOOL_CALL, TOOL_ERROR
- **Should be tool**: YES - as `axiom_event_stream`

### RuleEngine
- **Location**: `src-v3/rules/rule-engine.ts`
- **Purpose**: Intervention rule system
- **Key Functions**:
  - `registerRule()` - Add rules
  - `evaluateRules()` - Check rules
  - `getMatchingRules()` - Find applicable
- **Default Rules**:
  - no-planning-timeout (30s)
  - no-todos-allowed
  - progress-check (10s)
- **Should be tool**: YES - as `axiom_manage_rules`

### StreamInterceptor
- **Location**: `src-v3/interceptors/stream-interceptor.ts`
- **Purpose**: Intercept and modify streams
- **Key Functions**:
  - `interceptStream()` - Hook stream
  - `injectMessage()` - Add interventions
  - `monitorProgress()` - Track progress
- **Should be tool**: NO (internal mechanism)

## Configuration and Prompts

### TaskTypes
- **Location**: `src-v3/config/task-types.ts`
- **Functions**:
  - `detectTaskType()` - Classify prompts
  - `getSystemPrompt()` - Get appropriate prompt
- **Task Types**:
  - implementation
  - debugging
  - refactoring
  - analysis
  - documentation
- **Should be tool**: YES - as `axiom_detect_task_type`

### Universal Principles
- **Location**: `src-v3/principles/universal-principles.ts`
- **Coding Principles**:
  1. no-orphaned-files
  2. no-mocks
  3. real-execution
  4. verify-dont-trust
  5. no-todos
- **Thinking Principles**:
  1. action-over-planning
  2. fail-fast
  3. temporal-awareness
  4. measure-twice-cut-once
  5. explicit-over-implicit
- **Should be tool**: Already exposed via axiom_mcp_principles

## System Variables and Constants

### Critical Timeouts
```typescript
PLANNING_TIMEOUT = 30000  // 30 seconds
PROGRESS_CHECK_INTERVAL = 10000  // 10 seconds
HEARTBEAT_INTERVAL = 1000  // 1 second
FILE_CHECK_INTERVAL = 5000  // 5 seconds
DEFAULT_SPAWN_COUNT = 3
MAX_SPAWN_DEPTH = 5
MAX_SPAWN_COUNT = 10
```

### Intervention Messages
```typescript
PLANNING_TIMEOUT_MSG = "You have been planning for 30 seconds without creating any files. Stop planning and start implementing!"
NO_FILES_MSG = "No files created yet. Remember to write actual code, not just descriptions."
TODO_VIOLATION_MSG = "TODO detected! Replace with actual implementation immediately."
PROGRESS_CHECK_MSG = "10 seconds have passed. Have you created any files yet?"
```

### File Patterns
```typescript
CODE_FILE_EXTENSIONS = /\.(js|ts|py|java|cpp|c|h|hpp|go|rs|rb|php|swift|kt|scala|r|m|mm|sh|bash|zsh|fish|ps1|bat|cmd)$/i
IGNORE_PATTERNS = ['node_modules', '.git', 'dist', 'build', '__pycache__']
```

## Aggregators and Monitors

### StreamAggregator
- **Location**: `src-v3/aggregators/stream-aggregator.ts`
- **Purpose**: Multiplex child streams
- **Key Functions**:
  - `addStream()` - Add child stream
  - `aggregate()` - Combine outputs
  - `formatOutput()` - Pretty printing
- **Should be tool**: NO (internal utility)

### VerboseMonitor
- **Location**: `src-v3/monitors/verbose-monitor.ts`
- **Purpose**: Real-time monitoring
- **Key Functions**:
  - `startMonitoring()` - Begin monitor
  - `detectInterventions()` - Find issues
  - `highlightProblems()` - Visual alerts
- **Should be tool**: NO (part of verbose mode)

## WebSocket and Communication

### WebSocketServer
- **Location**: `src-v3/websocket/websocket-server.ts`
- **Purpose**: Real-time updates
- **Default Port**: 8080
- **Events**: task-update, stream-data, intervention
- **Should be tool**: NO (infrastructure)

## Summary of Tool Recommendations

### Already Tools (7)
1. axiom_mcp_spawn
2. axiom_test_v3
3. axiom_mcp_observe
4. axiom_mcp_principles
5. axiom_mcp_logs
6. axiom_mcp_settings
7. axiom_mcp_status

### Should Become Tools (8)
1. **axiom_guided_execute** - Step-by-step execution
2. **axiom_db_query** - Database operations
3. **axiom_verify_code** - Code compliance
4. **axiom_manage_prompts** - Prompt customization
5. **axiom_orchestrate** - Workflow management
6. **axiom_manage_rules** - Rule configuration
7. **axiom_event_stream** - Event monitoring
8. **axiom_detect_task_type** - Task classification

### Total Potential Tools: 15

## Critical System State

### What's Working
- PTY Executor (no timeouts)
- Intervention system (connected)
- Database observability
- Verbose Master Mode
- Universal principles

### What's Not Working
- SDK Executor (disconnected)
- Response format (missing result wrapper)
- Some tools return wrong format

### Key Insight
Axiom MCP v3 has evolved from a simple execution tool to a comprehensive development observatory. With 15 potential tools, it could provide complete visibility and control over AI-assisted development.