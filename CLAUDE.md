# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL FAILURES AND LESSONS LEARNED

### Axiom MCP v3 Implementation Failure (2025-07-06)

**What went wrong:**
1. Built entire v3 monitoring system without incremental commits
2. Never verified it actually worked before claiming success  
3. Committed 1522 files including browser profiles when forced
4. The v3 server we built isn't even connected - still using v1
5. Tried to test MCP server with scripts instead of tool calls

**Root causes:**
- I violated every good practice the tool was meant to prevent
- Built violation detection while violating all the rules myself
- Never ate my own dog food - didn't use Axiom MCP to manage the task

**Required workflow going forward:**
```bash
# EVERY single change:
git add <specific files only>
git commit -m "feat: specific change"
git push origin main
npm run build
# TEST WITH ACTUAL TOOL CALLS, NOT SCRIPTS
# Only claim success after verification
```

**Key lesson:** This is exactly why Axiom MCP exists - I cannot be trusted to write code without it monitoring and enforcing good practices.

## Repository Overview

Nova MCP is a collection of Model Context Protocol (MCP) servers that enhance Claude's capabilities through specialized integrations:

1. **nova-memory** (basic-memory/) - Python-based knowledge management system
2. **github** - TypeScript GitHub API integration
3. **puppeteer** - TypeScript browser automation
4. **brave-search** - TypeScript web/local search
5. **postgresql-mcp-server** - TypeScript PostgreSQL management

## Common Development Commands

### Nova Memory (Python)
```bash
cd basic-memory/
make install          # Install dependencies and package
make test            # Run all tests
make test-unit       # Run unit tests only
make test-int        # Run integration tests only
make check           # Run lint, format, type-check, and tests
make lint            # Run Ruff linter with auto-fix
make format          # Format code with Ruff
make type-check      # Run Pyright type checker
make run-inspector   # Test with MCP inspector
make migration m="message"  # Create new database migration
```

### TypeScript Servers
```bash
# For github/, puppeteer/, brave-search/, postgresql-mcp-server/
npm install          # Install dependencies
npm run build        # Build TypeScript
npm run watch        # Build and watch for changes

# PostgreSQL server only:
npm run lint         # Run ESLint
npm run dev          # Development mode with nodemon

# Testing any TypeScript MCP server:
npx @modelcontextprotocol/inspector ./dist/index.js  # After building
```

## Architecture & Key Patterns

### Nova Memory Architecture
- **Repository Pattern**: All data access through repository classes (e.g., `NoteRepository`, `EntityRepository`)
- **Async SQLAlchemy 2.0**: Use async patterns throughout, avoid legacy Query API
- **Service Layer**: Business logic in service classes, not in MCP tools directly
- **MCP Tools**: Keep atomic and composable, delegate to services
- **Testing**: Use in-memory SQLite for tests, avoid mocks

### TypeScript Servers Architecture
- **MCP SDK**: All servers use `@modelcontextprotocol/sdk` for protocol implementation
- **Tool Pattern**: Each capability exposed as an MCP tool with structured parameters
- **Error Handling**: Tools should return descriptive errors, not throw exceptions
- **Build Output**: Compiled JavaScript goes to `dist/` or `build/` directories

### Puppeteer Server Architecture
- **Global State**: Single browser instance and page managed globally
- **Security**: Validates dangerous browser arguments (requires `allowDangerous` flag)
- **Console Capture**: Forwards browser console logs as MCP resources
- **Screenshot Storage**: In-memory storage with optional base64 encoding
- **Launch Options**: Configurable via environment or per-navigation request
- **Available Tools**:
  - `puppeteer_navigate`: Navigate with optional browser configuration
  - `puppeteer_screenshot`: Capture full page or element screenshots
  - `puppeteer_click/fill/select/hover`: DOM interaction
  - `puppeteer_evaluate`: Execute JavaScript in browser context
  - `puppeteer_google_search`: Extract Google search results

### Database Schema (Nova Memory)
- **Notes**: Main content storage with markdown, tags, and metadata
- **Entities**: Extracted concepts with types and aliases
- **Relations**: Connections between entities
- **Entity Mentions**: Links between notes and entities
- **Full-text search**: SQLite FTS5 for content search

## Development Guidelines

### Python Code Style
- Line length: 100 characters max
- Use type annotations everywhere
- Follow async patterns with SQLAlchemy 2.0
- Test with pytest, avoid mocks when possible
- Format with Ruff, type-check with Pyright

### TypeScript Code Style
- Use strict TypeScript configuration
- Follow MCP SDK patterns for tool implementation
- Handle errors gracefully in tools
- Build before committing changes

### Testing Strategy
- Nova Memory: Comprehensive unit and integration tests
- Run tests before committing: `make test` (Python) 
- TypeScript projects currently lack test infrastructure

### Database Migrations (Nova Memory)
- Use Alembic for schema changes
- Create migrations: `make migration m="description"`
- Migrations auto-apply on startup in development

## Key Implementation Details

### MCP Tool Design
- Tools should be focused on single responsibilities
- Use descriptive parameter names and descriptions
- Return structured data that can be easily consumed
- Handle edge cases and provide helpful error messages

### File Synchronization (Nova Memory)
- Monitors directories for .md and .txt files
- Two-way sync between database and filesystem
- Handles file moves, renames, and deletions
- Preserves note IDs through file metadata

### Search Capabilities (Nova Memory)
- Full-text search with SQLite FTS5
- Entity and relation search
- Tag-based filtering
- Natural language queries supported

## Important Notes

- Nova Memory was renamed from basic-memory (wrapper script handles compatibility)
- Each TypeScript server can be tested with `npx @modelcontextprotocol/inspector`
- PostgreSQL server includes comprehensive database management tools
- Brave Search provides both web and local business search
- GitHub server enables direct repository manipulation

### Puppeteer Server Notes
- Browser instances persist between navigation calls for efficiency
- Launch options can be set via `PUPPETEER_LAUNCH_OPTIONS` environment variable
- Docker deployment uses headless Chrome; NPX deployment supports headed mode
- Security: Dangerous browser args (like `--no-sandbox`) blocked by default
- Screenshots stored in memory with `screenshot://<name>` resource URIs
- Console logs available via `console://logs` resource