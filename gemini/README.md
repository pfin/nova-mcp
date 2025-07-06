# Gemini MCP Server

A TypeScript-based Model Context Protocol (MCP) server that integrates Google's Gemini CLI with Claude Code, providing AI-powered second opinions and consultations.

Based on the Python implementation from [this GitHub Gist](https://gist.github.com/AndrewAltimit/fc5ba068b73e7002cbe4e9721cebb0f5).

## Features

- 🤖 **AI Consultation**: Get second opinions from Gemini on technical decisions
- 🔍 **Uncertainty Detection**: Automatically detects when Claude expresses uncertainty
- ⚡ **Manual & Automatic Modes**: Consult on-demand or automatically when uncertainty is detected
- 🛡️ **Rate Limiting**: Built-in rate limiting to respect API quotas
- 📊 **Status Monitoring**: Track consultation statistics and configuration
- 🚀 **Streaming Support**: Real-time streaming responses from Gemini CLI
- 🌐 **Web Search Integration**: Built-in web search capabilities (requires Brave Search MCP)

## Prerequisites

1. **Node.js 18+** (recommended: 22.16.0)
2. **Gemini CLI** installed globally:
   ```bash
   npm install -g @google/gemini-cli
   ```
3. **Google Account** for Gemini authentication (free tier: 60 req/min, 1,000/day)

## Installation

1. Clone or navigate to the Nova MCP repository:
   ```bash
   cd nova-mcp/gemini
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the TypeScript code:
   ```bash
   npm run build
   ```

## Configuration

### Environment Variables

Create a `.env` file or set these environment variables:

```bash
GEMINI_ENABLED=true                   # Enable/disable integration
GEMINI_AUTO_CONSULT=true              # Auto-consult on uncertainty
GEMINI_CLI_COMMAND=gemini             # CLI command to use
GEMINI_TIMEOUT=300                    # Query timeout in seconds (default: 300s/5 minutes)
GEMINI_RATE_LIMIT=2                   # Seconds between API calls
GEMINI_MODEL=gemini-2.5-pro          # Gemini model to use
GEMINI_ENABLE_STREAMING=true          # Enable streaming responses
GEMINI_ENABLE_TOOL_CHAINING=false     # Enable recursive tool calls (experimental)
GEMINI_MAX_RECURSION_DEPTH=5          # Max depth for recursive calls
```

### Claude Code Configuration

Add to your `mcp-config.json`:

```json
{
  "mcpServers": {
    "gemini": {
      "command": "node",
      "args": ["path/to/nova-mcp/gemini/dist/index.js"],
      "env": {
        "GEMINI_ENABLED": "true",
        "GEMINI_AUTO_CONSULT": "true"
      }
    }
  }
}
```

## Available Tools

### 1. `consult_gemini`
Get a second opinion from Gemini on any technical question.

**Parameters:**
- `query` (required): The question to ask Gemini
- `context` (optional): Additional context for the query

**Example:**
```json
{
  "query": "Should I use WebSockets or gRPC for real-time communication?",
  "context": "Building a multiplayer game with 1000+ concurrent users"
}
```

### 2. `gemini_status`
Check the current status of the Gemini integration.

**Returns:**
- Integration enabled/disabled status
- Auto-consultation setting
- Consultation statistics
- Current configuration

### 3. `toggle_gemini_auto_consult`
Enable or disable automatic consultation when uncertainty is detected.

**Parameters:**
- `enable` (boolean): true to enable, false to disable

### 4. `consult_gemini_stream`
Get a streaming response from Gemini for real-time feedback.

**Parameters:**
- `query` (required): The question to ask Gemini
- `context` (optional): Additional context for the query

**Features:**
- Real-time streaming of Gemini's response
- Lower latency for first token
- Better user experience for long responses

### 5. `web_search`
Search the web for information (placeholder for future Brave Search integration).

**Parameters:**
- `query` (required): The search query
- `count` (optional): Number of results (default: 10)

**Note:** This tool currently returns instructions to use Brave Search MCP directly. Full integration coming soon.

## Uncertainty Detection

The server automatically detects uncertainty patterns including:

- **Basic Uncertainty**: "I'm not sure", "I think", "possibly", "probably"
- **Complex Decisions**: "multiple approaches", "trade-offs", "alternatives"
- **Critical Operations**: "production", "security", "database migration"

When auto-consultation is enabled and uncertainty is detected, Gemini is automatically consulted for a second opinion.

## Development

### Project Structure
```
gemini/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── gemini-integration.ts # Core integration logic
│   ├── tools/               # MCP tool implementations
│   ├── types/               # TypeScript types
│   └── utils/               # Utilities
├── dist/                    # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

### Building
```bash
npm run build    # Build TypeScript
npm run watch    # Build and watch for changes
```

### Testing
Test with the MCP inspector:
```bash
npx @modelcontextprotocol/inspector ./dist/index.js
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Gemini CLI not found | Install with `npm install -g @google/gemini-cli` |
| Authentication errors | 1. Run `gcloud auth login`<br>2. Set project: `gcloud config set project YOUR_PROJECT_ID`<br>3. Enable API: `gcloud services enable cloudaicompanion.googleapis.com` |
| "SERVICE_DISABLED" error | The Gemini API needs to be enabled in your Google Cloud project (see authentication steps above) |
| Node version issues | Use Node.js 18+ (recommended: `nvm use 22.16.0`) |
| Timeout errors | 1. Default timeout is now 5 minutes (300s)<br>2. Increase via `GEMINI_TIMEOUT` environment variable<br>3. Network issues may cause timeouts |
| Rate limit errors | Increase `GEMINI_RATE_LIMIT` delay |
| Process hangs | The Gemini CLI may hang on auth issues - the server now handles this with proper timeouts |

## Security Considerations

1. **API Credentials**: Never commit credentials; use environment variables
2. **Data Privacy**: Be cautious about sending proprietary code to Gemini
3. **Rate Limiting**: Respect API quotas (free tier: 60/min, 1,000/day)
4. **Input Sanitization**: All queries are sanitized before sending

## License

MIT License - See the parent Nova MCP repository for details.

## Credits

This TypeScript implementation is based on the Python version from [AndrewAltimit's Gist](https://gist.github.com/AndrewAltimit/fc5ba068b73e7002cbe4e9721cebb0f5).