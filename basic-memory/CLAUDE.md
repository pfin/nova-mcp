# CLAUDE.md - Nova Memory Project Guide

## Project Overview

Nova Memory is a local-first knowledge management system built on the Model Context Protocol (MCP). It enables
bidirectional communication between LLMs (like Claude) and markdown files, creating a personal knowledge graph that can
be traversed using links between documents.

## CODEBASE DEVELOPMENT

### Project information

See the [README.md](README.md) file for a project overview.

### Build and Test Commands

- Install: `make install` or `pip install -e ".[dev]"`
- Run tests: `uv run pytest -p pytest_mock -v` or `make test`
- Single test: `pytest tests/path/to/test_file.py::test_function_name`
- Lint: `make lint` or `ruff check . --fix`
- Type check: `make type-check` or `uv run pyright`
- Format: `make format` or `uv run ruff format .`
- Run all code checks: `make check` (runs lint, format, type-check, test)
- Create db migration: `make migration m="Your migration message"`
- Run development MCP Inspector: `make run-inspector`

### Code Style Guidelines

- Line length: 100 characters max
- Python 3.12+ with full type annotations
- Format with ruff (consistent styling)
- Import order: standard lib, third-party, local imports
- Naming: snake_case for functions/variables, PascalCase for classes
- Prefer async patterns with SQLAlchemy 2.0
- Use Pydantic v2 for data validation and schemas
- CLI uses Typer for command structure
- API uses FastAPI for endpoints
- Follow the repository pattern for data access
- Tools communicate to api routers via the httpx ASGI client (in process)
- avoid using "private" functions in modules or classes (prepended with _)

### Codebase Architecture

- `/alembic` - Alembic db migrations
- `/api` - FastAPI implementation of REST endpoints
- `/cli` - Typer command-line interface
- `/markdown` - Markdown parsing and processing
- `/mcp` - Model Context Protocol server implementation
- `/models` - SQLAlchemy ORM models
- `/repository` - Data access layer
- `/schemas` - Pydantic models for validation
- `/services` - Business logic layer
- `/sync` - File synchronization services

### Development Notes

- MCP tools are defined in src/basic_memory/mcp/tools/
- MCP prompts are defined in src/basic_memory/mcp/prompts/
- MCP tools should be atomic, composable operations
- Use `textwrap.dedent()` for multi-line string formatting in prompts and tools
- MCP Prompts are used to invoke tools and format content with instructions for an LLM
- Schema changes require Alembic migrations
- SQLite is used for indexing and full text search, files are source of truth
- Testing uses pytest with asyncio support (strict mode)
- Test database uses in-memory SQLite
- Avoid creating mocks in tests in most circumstances.
- Each test runs in a standalone environment with in memory SQLite and tmp_file directory
- Do not use mocks in tests if possible. Tests run with an in memory sqlite db, so they are not needed. See fixtures in conftest.py

## BASIC MEMORY PRODUCT USAGE

### Knowledge Structure

- Entity: Any concept, document, or idea represented as a markdown file
- Observation: A categorized fact about an entity (`- [category] content`)
- Relation: A directional link between entities (`- relation_type [[Target]]`)
- Frontmatter: YAML metadata at the top of markdown files
- Knowledge representation follows precise markdown format:
    - Observations with [category] prefixes
    - Relations with WikiLinks [[Entity]]
    - Frontmatter with metadata

### Nova Memory Commands

- Sync knowledge: `nova-memory sync` or `nova-memory sync --watch`
- Import from Claude: `nova-memory import claude conversations`
- Import from ChatGPT: `nova-memory import chatgpt`
- Import from Memory JSON: `nova-memory import memory-json`
- Check sync status: `nova-memory status`
- Tool access: `nova-memory tools` (provides CLI access to MCP tools)
    - Guide: `nova-memory tools nova-memory-guide`
    - Continue: `nova-memory tools continue-conversation --topic="search"`

### MCP Capabilities

- Nova Memory exposes these MCP tools to LLMs:

  **Content Management:**
    - `write_note(title, content, folder, tags)` - Create/update markdown notes with semantic observations and relations
    - `read_note(identifier, page, page_size)` - Read notes by title, permalink, or memory:// URL with knowledge graph
      awareness
    - `read_file(path)` - Read raw file content (text, images, binaries) without knowledge graph processing

  **Knowledge Graph Navigation:**
    - `build_context(url, depth, timeframe)` - Navigate the knowledge graph via memory:// URLs for conversation
      continuity
    - `recent_activity(type, depth, timeframe)` - Get recently updated information with specified timeframe (e.g., "
      1d", "1 week")

  **Search & Discovery:**
    - `search_notes(query, page, page_size)` - Full-text search across all content with filtering options

  **Visualization:**
    - `canvas(nodes, edges, title, folder)` - Generate Obsidian canvas files for knowledge graph visualization

- MCP Prompts for better AI interaction:
    - `ai_assistant_guide()` - Guidance on effectively using Nova Memory tools for AI assistants
    - `continue_conversation(topic, timeframe)` - Continue previous conversations with relevant historical context
    - `search_notes(query, after_date)` - Search with detailed, formatted results for better context understanding
    - `recent_activity(timeframe)` - View recently changed items with formatted output
    - `json_canvas_spec()` - Full JSON Canvas specification for Obsidian visualization

## AI-Human Collaborative Development

Nova Memory emerged from and enables a new kind of development process that combines human and AI capabilities. Instead
of using AI just for code generation, we've developed a true collaborative workflow:

1. AI (LLM) writes initial implementation based on specifications and context
2. Human reviews, runs tests, and commits code with any necessary adjustments
3. Knowledge persists across conversations using Nova Memory's knowledge graph
4. Development continues seamlessly across different AI sessions with consistent context
5. Results improve through iterative collaboration and shared understanding

This approach has allowed us to tackle more complex challenges and build a more robust system than either humans or AI
could achieve independently.

## GitHub Integration

Nova Memory uses Claude directly into the development workflow through GitHub:

### GitHub MCP Tools

Using the GitHub Model Context Protocol server, Claude can:

- **Repository Management**:
    - View repository files and structure
    - Read file contents
    - Create new branches
    - Create and update files

- **Issue Management**:
    - Create new issues
    - Comment on existing issues
    - Close and update issues
    - Search across issues

- **Pull Request Workflow**:
    - Create pull requests
    - Review code changes
    - Add comments to PRs

This integration enables Claude to participate as a full team member in the development process, not just as a code
generation tool. Claude's GitHub account ([bm-claudeai](https://github.com/bm-claudeai)) is a member of the Basic
Machines organization with direct contributor access to the codebase.

### Collaborative Development Process

With GitHub integration, the development workflow includes:

1. **Direct code review** - Claude can analyze PRs and provide detailed feedback
2. **Contribution tracking** - All of Claude's contributions are properly attributed in the Git history
3. **Branch management** - Claude can create feature branches for implementations
4. **Documentation maintenance** - Claude can keep documentation updated as the code evolves

With this integration, the AI assistant is a full-fledged team member rather than just a tool for generating code
snippets.


### Nova Memory Pro

Nova Memory Pro is a desktop GUI application that wraps the nova-memory CLI/MCP tools:

- Built with Tauri (Rust), React (TypeScript), and a Python FastAPI sidecar
- Provides visual knowledge graph exploration and project management
- Uses the same core codebase but adds a desktop-friendly interface
- Project configuration is shared between CLI and Pro versions
- Multiple project support with visual switching interface

## Release and Version Management

Nova Memory uses `uv-dynamic-versioning` for automatic version management based on git tags:

### Version Types
- **Development versions**: Automatically generated from commits (e.g., `0.12.4.dev26+468a22f`)
- **Beta releases**: Created by tagging with beta suffixes (e.g., `v0.13.0b1`, `v0.13.0rc1`)
- **Stable releases**: Created by tagging with version numbers (e.g., `v0.13.0`)

### Release Workflows

#### Development Builds (Automatic)
- Triggered on every push to `main` branch
- Publishes dev versions like `0.12.4.dev26+468a22f` to PyPI
- Allows continuous testing of latest changes
- Users install with: `pip install basic-memory --pre --force-reinstall`

#### Beta/RC Releases (Manual)
- Create beta tag: `git tag v0.13.0b1 && git push origin v0.13.0b1`
- Automatically builds and publishes to PyPI as pre-release
- Users install with: `pip install basic-memory --pre`
- Use for milestone testing before stable release

#### Stable Releases (Manual)
- Create version tag: `git tag v0.13.0 && git push origin v0.13.0`
- Automatically builds, creates GitHub release, and publishes to PyPI
- Users install with: `pip install basic-memory`

### For Development
- No manual version bumping required
- Versions automatically derived from git tags
- `pyproject.toml` uses `dynamic = ["version"]`
- `__init__.py` dynamically reads version from package metadata