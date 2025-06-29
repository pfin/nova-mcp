# Gemini MCP Server Implementation Plan

## Overview
Build a TypeScript-based MCP server that integrates with Google's Gemini CLI to provide AI-powered second opinions and consultations within Claude Code.

## Architecture

### 1. Project Structure
```
gemini/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── gemini-integration.ts # Core Gemini integration logic
│   ├── tools/               # MCP tool implementations
│   │   ├── consult.ts       # Consult Gemini tool
│   │   ├── status.ts        # Status check tool
│   │   └── toggle.ts        # Toggle auto-consultation
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # Shared types
│   └── utils/               # Utility functions
│       ├── patterns.ts      # Uncertainty detection patterns
│       └── rate-limiter.ts  # Rate limiting implementation
├── package.json             # Project dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── README.md                # Documentation
└── .env.example             # Example environment variables
```

### 2. Core Components

#### A. MCP Server (`src/index.ts`)
- Initialize MCP server using `@modelcontextprotocol/sdk`
- Register tools: `consult_gemini`, `gemini_status`, `toggle_gemini_auto_consult`
- Handle configuration from environment variables
- Implement error handling and logging

#### B. Gemini Integration (`src/gemini-integration.ts`)
- Execute Gemini CLI commands using Node.js child_process
- Handle rate limiting (default: 2s between calls)
- Manage timeout handling (default: 60s)
- Parse and format Gemini responses
- Cache recent consultations to avoid duplicates

#### C. Uncertainty Detection (`src/utils/patterns.ts`)
- Detect uncertainty patterns in text
- Identify complex decision scenarios
- Recognize critical operations
- Configurable pattern matching

#### D. MCP Tools
1. **consult_gemini**: Manual consultation with context
2. **gemini_status**: Check integration status and statistics
3. **toggle_gemini_auto_consult**: Enable/disable auto-consultation

### 3. Key Features

#### Configuration Options
- `GEMINI_ENABLED`: Enable/disable integration
- `GEMINI_AUTO_CONSULT`: Auto-consult on uncertainty
- `GEMINI_CLI_COMMAND`: CLI command (default: "gemini")
- `GEMINI_TIMEOUT`: Query timeout in seconds
- `GEMINI_RATE_LIMIT`: Delay between calls
- `GEMINI_MODEL`: Model to use (e.g., "gemini-2.0-flash-exp")

#### Uncertainty Patterns
- Basic uncertainty: "I'm not sure", "I think", "possibly"
- Complex decisions: "multiple approaches", "trade-offs"
- Critical operations: "production", "security", "database migration"

### 4. Implementation Steps

1. **Setup TypeScript Project**
   - Initialize package.json with MCP SDK dependency
   - Configure tsconfig.json for ES modules
   - Set up build scripts

2. **Core Implementation**
   - Create MCP server with tool registration
   - Implement Gemini CLI integration
   - Add uncertainty detection
   - Implement rate limiting

3. **Tools Implementation**
   - Consult tool with query and context parameters
   - Status tool returning current configuration
   - Toggle tool for enabling/disabling features

4. **Testing & Documentation**
   - Test with MCP inspector
   - Create comprehensive README
   - Add usage examples

### 5. Dependencies
- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `zod`: Schema validation
- `zod-to-json-schema`: JSON schema generation
- TypeScript and Node.js types

### 6. Build & Deployment
- Compile TypeScript to JavaScript
- Make entry point executable
- Compatible with MCP inspector for testing
- Can be added to Claude Code's mcp-config.json

## Success Criteria
1. Successfully integrates with Gemini CLI
2. Provides accurate uncertainty detection
3. Handles rate limiting and errors gracefully
4. Works seamlessly with Claude Code
5. Easy to configure and extend