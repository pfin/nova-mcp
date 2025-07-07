#!/usr/bin/env node
/**
 * Axiom MCP v3 - Combines v1 MCP server with v2 PTY executor
 *
 * CRITICAL FIXES:
 * - Replaces execSync with PTY to prevent 30-second timeout
 * - Enables real parallelism with worker threads
 * - Maintains all v1 tools and functionality
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// Import v3 tools only
import { axiomMcpSpawnTool, handleAxiomMcpSpawn } from './tools/axiom-mcp-spawn.js';
// Import v3 test tool
import { axiomTestV3Tool, handleAxiomTestV3 } from './tools/axiom-test-v3.js';
// Import v3 observability and principles tools
import { axiomMcpObserveTool, handleAxiomMcpObserve } from './tools/axiom-mcp-observe.js';
import { axiomMcpPrinciplesTool, handleAxiomMcpPrinciples } from './tools/axiom-mcp-principles.js';
import { EventBus, EventType } from './core/event-bus.js';
import { z } from 'zod';
import { StatusManager } from './managers/status-manager.js';
// V3 subprocess wrapper that uses PTY instead of execSync
import { ClaudeCodeSubprocessV3 } from './claude-subprocess-v3.js';
// Import database
import { ConversationDB } from './database/conversation-db.js';
// Initialize server
const server = new Server({
    name: 'axiom-mcp',
    version: '3.0.0',
}, {
    capabilities: {
        tools: {},
        logging: {},
        resources: {},
    }
});
// Initialize components
const eventBus = new EventBus({ logDir: './logs-v3' });
const statusManager = new StatusManager();
const claudeCode = new ClaudeCodeSubprocessV3({ eventBus });
// Initialize database
let conversationDB = null;
(async () => {
    try {
        conversationDB = new ConversationDB('./axiom-v3.db');
        await conversationDB.initialize();
        console.error('[DB] Initialized successfully');
    }
    catch (error) {
        console.error('[DB] Failed to initialize:', error);
    }
})();
// V3 doesn't need context manager from v1
// Error handling
process.on('uncaughtException', (error) => {
    console.error('[CRITICAL] Uncaught exception:', error);
    eventBus.logEvent({
        taskId: 'system',
        workerId: 'main',
        event: EventType.ERROR,
        payload: error
    });
});
// Tool implementations with v3 subprocess
const tools = [
    axiomMcpSpawnTool,
    axiomTestV3Tool,
    axiomMcpObserveTool,
    axiomMcpPrinciplesTool,
];
// Handler map
const handlers = {
    axiom_mcp_spawn: handleAxiomMcpSpawn,
    axiom_test_v3: handleAxiomTestV3,
    axiom_mcp_observe: handleAxiomMcpObserve,
    axiom_mcp_principles: handleAxiomMcpPrinciples,
};
// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error('[MCP] tools/list called');
    return { tools };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.error(`[MCP] tools/call: ${request.params.name}`);
    const { name, arguments: args } = request.params;
    const handler = handlers[name];
    if (!handler) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    try {
        // Log tool call
        eventBus.logEvent({
            taskId: 'system',
            workerId: 'main',
            event: EventType.TOOL_CALL,
            payload: { tool: name, args }
        });
        // Call handler with v3 subprocess
        // Cast to any to bypass TypeScript strict checking for different handler signatures
        const result = await handler(args || {}, statusManager, conversationDB);
        return result;
    }
    catch (error) {
        console.error(`[MCP] Tool error: ${error.message}`);
        eventBus.logEvent({
            taskId: 'system',
            workerId: 'main',
            event: EventType.TOOL_ERROR,
            payload: { tool: name, error: error.message }
        });
        throw new McpError(ErrorCode.InternalError, error.message);
    }
});
// Logging handlers
server.setRequestHandler(z.object({ method: z.literal('logging/levels') }), async () => {
    return { levels: ['debug', 'info', 'warning', 'error'] };
});
// Resource handlers
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    console.error('[MCP] resources/list called');
    return {
        resources: [
            {
                uri: 'axiom://help',
                name: 'Axiom v3 Help Manual',
                description: 'Comprehensive guide to using Axiom MCP v3',
                mimeType: 'text/markdown'
            },
            {
                uri: 'axiom://status',
                name: 'System Status',
                description: 'Current system status and statistics',
                mimeType: 'application/json'
            },
            {
                uri: 'axiom://logs',
                name: 'Recent Logs',
                description: 'Recent event logs from the system',
                mimeType: 'text/plain'
            }
        ]
    };
});
// Read specific resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    console.error(`[MCP] resources/read: ${request.params.uri}`);
    const { uri } = request.params;
    switch (uri) {
        case 'axiom://help': {
            const helpPath = path.join(__dirname, '../resources/help-manual.md');
            const content = fs.readFileSync(helpPath, 'utf-8');
            return {
                contents: [{
                        uri: 'axiom://help',
                        mimeType: 'text/markdown',
                        text: content
                    }]
            };
        }
        case 'axiom://status': {
            const stats = {
                version: '3.0.0',
                uptime: process.uptime(),
                eventBus: eventBus.getStats(),
                timestamp: new Date().toISOString()
            };
            return {
                contents: [{
                        uri: 'axiom://status',
                        mimeType: 'application/json',
                        text: JSON.stringify(stats, null, 2)
                    }]
            };
        }
        case 'axiom://logs': {
            // For now, return placeholder
            const logText = 'Event logging available via WebSocket on port 8080';
            return {
                contents: [{
                        uri: 'axiom://logs',
                        mimeType: 'text/plain',
                        text: logText
                    }]
            };
        }
        default:
            throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    }
});
// Start server
async function main() {
    console.error('Axiom MCP v3 starting...');
    console.error('- PTY executor prevents timeouts');
    console.error('- Worker threads enable parallelism');
    console.error('- Event bus tracks all operations');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Axiom MCP v3 ready!');
}
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map