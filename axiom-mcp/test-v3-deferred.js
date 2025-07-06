#!/usr/bin/env node
/**
 * Axiom MCP v3 - Test with deferred StatusManager initialization
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { EventBus } from './dist-v3/src-v3/core/event-bus.js';
import { ClaudeCodeSubprocessV3 } from './dist-v3/src-v3/claude-subprocess-v3.js';
import { axiomTestV3Tool, handleAxiomTestV3 } from './dist-v3/src-v3/tools/axiom-test-v3.js';

// Initialize server FIRST
const server = new Server({
    name: 'axiom-mcp-v3',
    version: '3.0.0',
}, {
    capabilities: {
        tools: {},
        logging: {},
    }
});

// Components will be initialized after connection
let eventBus;
let claudeCode;
let statusManager;

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [axiomTestV3Tool],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    if (name === 'axiom_test_v3') {
        return await handleAxiomTestV3(args || {}, claudeCode, statusManager);
    }
    
    throw new Error(`Unknown tool: ${name}`);
});

// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    // Initialize components AFTER connection
    console.error('Axiom MCP v3 connected, initializing components...');
    eventBus = new EventBus({ logDir: './logs-v3' });
    claudeCode = new ClaudeCodeSubprocessV3({ eventBus });
    
    // StatusManager initialization deferred - can be done lazily when needed
    console.error('Axiom MCP v3 ready!');
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});