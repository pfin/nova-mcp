# Axiom MCP v3 - Current State Documentation

Last Updated: January 12, 2025

## Overview

Axiom MCP v3 is a Model Context Protocol (MCP) server that implements intelligent research tree systems with Monte Carlo Tree Search (MCTS), real-time intervention, and parallel task execution. The system is designed to overcome the "research-only" mode problem by enforcing actual implementation through task-aware prompts and verification.

## Architecture

### Core Components

1. **PTY Executor** (`src-v3/executors/pty-executor.ts`)
   - Prevents 30-second timeouts using pseudo-terminal execution
   - Handles streaming output with real-time intervention
   - Manages interactive sessions without hanging

2. **MCTS Engine** (`src-v3/mcts/`)
   - Implements Monte Carlo Tree Search for intelligent task exploration
   - UCB1 algorithm for balancing exploration vs exploitation
   - Quality scoring and path optimization

3. **Real-time Intervention** (`src-v3/monitor/`)
   - Rule-based monitoring of execution patterns
   - Detects research-only behavior and forces implementation
   - Live dashboard for monitoring task progress

4. **Event-Driven Architecture** (`src-v3/events/`)
   - Central event bus for all components
   - JSONL logging for audit trails
   - WebSocket support for real-time updates

5. **Prompt Configuration** (`src-v3/config/`)
   - Task-aware prompts (research vs implementation)
   - Framework-specific prompts (Next.js, databases)
   - User-customizable via JSON configuration

## Current Implementation Status

### Working Features
- ✅ Basic MCP tools exposed and functional
- ✅ PTY executor prevents timeouts
- ✅ MCTS algorithm implemented
- ✅ Event bus and logging system
- ✅ Prompt configuration system
- ✅ Build scripts with executable permissions

### Partially Implemented
- 🔄 Real-time intervention (rules defined, not fully integrated)
- 🔄 Framework-specific tools (prompts created, tools incomplete)
- 🔄 SystemVerification (concept defined, needs implementation)

### Not Yet Implemented
- ❌ WebSocket dashboard UI
- ❌ A/B testing for prompt optimization
- ❌ Database migration tracking
- ❌ Full integration tests

## File Structure

```
axiom-mcp/
├── src-v3/                     # v3 source code
│   ├── index.ts               # Main MCP server entry
│   ├── executors/             # Task execution engines
│   │   ├── pty-executor.ts    # PTY-based executor
│   │   └── claude-executor.ts # Original Claude Code executor
│   ├── mcts/                  # Monte Carlo Tree Search
│   │   ├── mcts-engine.ts     # Core MCTS algorithm
│   │   └── mcts-types.ts      # Type definitions
│   ├── monitor/               # Real-time monitoring
│   │   ├── intervention.ts    # Rule-based interventions
│   │   └── dashboard.ts       # WebSocket dashboard
│   ├── events/                # Event system
│   │   ├── event-bus.ts       # Central event bus
│   │   └── event-logger.ts    # JSONL logging
│   ├── config/                # Configuration
│   │   ├── prompt-config.ts   # Prompt configuration
│   │   └── framework-prompts.ts # Framework-specific prompts
│   └── tools/                 # MCP tools
│       ├── axiom-*.ts         # Core Axiom tools
│       └── framework/         # Framework-specific tools
├── dist-v3/                   # Compiled v3 code
├── logs-v3/                   # v3 execution logs
├── prompt-config.json         # User-editable prompts
├── tsconfig.v3.json          # v3 TypeScript config
└── package.json              # NPM configuration
```

## Known Issues

1. **Inspector Timeout**: MCP inspector times out waiting for connection
2. **Integration Gaps**: Components not fully wired together
3. **Verification Missing**: SystemVerification not implemented
4. **Framework Tools**: Database and Next.js tools incomplete

## Configuration

### Environment Variables
- `AXIOM_LOG_LEVEL`: Set logging verbosity (debug|info|warn|error)
- `AXIOM_PROMPT_CONFIG`: Path to custom prompt configuration
- `AXIOM_MAX_WORKERS`: Maximum parallel tasks (default: 4)

### Prompt Configuration
Edit `prompt-config.json` to customize:
- System prompts for different task types
- Framework-specific instructions
- Intervention rules and thresholds

## Testing

### Unit Tests
```bash
npm test
```

### MCP Inspector
```bash
npm run inspect:v3
```

### Manual Testing
```bash
npm run build:v3
node dist-v3/src-v3/index.js
```

## Recent Changes

- Removed v2 implementation (redundant with v3)
- Added executable permissions to build scripts
- Created comprehensive prompt configuration system
- Cleaned up 31+ junk documentation files
- Fixed TypeScript compilation errors

## Next Steps

1. Fix MCP inspector connection issues
2. Complete framework-specific tools
3. Implement SystemVerification
4. Create integration tests
5. Wire together all components