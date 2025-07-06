#!/bin/bash
# Load environment variables from .env file
set -a
source /home/peter/nova-mcp/chatgpt-puppeteer/.env
set +a

# Run the ChatGPT MCP server
exec node /home/peter/nova-mcp/chatgpt-puppeteer/dist/index.js "$@"