#!/usr/bin/env node

/**
 * Test script to verify MCP inspector connection
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server({
  name: 'axiom-mcp-test',
  version: '0.1.0'
}, {
  capabilities: {
    tools: {}
  }
});

// Add a simple test tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [{
      name: 'test_connection',
      description: 'Test if connection works',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      }
    }]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'test_connection') {
    return {
      content: [{
        type: 'text',
        text: `Connection successful! Message: ${request.params.arguments?.message || 'No message'}`
      }]
    };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Test server started successfully');
}

main().catch(console.error);