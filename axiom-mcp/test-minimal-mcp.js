#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Minimal MCP server
const server = new Server({
    name: 'test-minimal',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    }
});

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { 
        tools: [{
            name: 'test_tool',
            description: 'A simple test tool',
            inputSchema: {
                type: 'object',
                properties: {
                    message: { type: 'string' }
                }
            }
        }]
    };
});

// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});