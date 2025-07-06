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
// Import v1 tools (we'll update their implementations)
import { axiomMcpGoalTool, handleAxiomMcpGoal } from '../src/tools/axiom-mcp-goal.js';
import { axiomMcpExploreTool, handleAxiomMcpExplore } from '../src/tools/axiom-mcp-explore.js';
import { axiomMcpChainTool, handleAxiomMcpChain, initializeContextManager as initChainContextManager } from '../src/tools/axiom-mcp-chain.js';
import { axiomMcpSynthesisTool, handleAxiomMcpSynthesis, initializeSynthesisContextManager } from '../src/tools/axiom-mcp-synthesis.js';
import { axiomMcpStatusTool, handleAxiomMcpStatus } from '../src/tools/axiom-mcp-status.js';
import { axiomMcpSpawnTool, handleAxiomMcpSpawn } from '../src/tools/axiom-mcp-spawn.js';
import { axiomMcpSpawnMctsTool, handleAxiomMcpSpawnMcts } from '../src/tools/axiom-mcp-spawn-mcts.js';
import { axiomMcpSpawnStreamingTool, handleAxiomMcpSpawnStreaming } from '../src/tools/axiom-mcp-spawn-streaming.js';
import { axiomMcpTreeTool, handleAxiomMcpTree } from '../src/tools/axiom-mcp-tree.js';
import { axiomMcpGoalsTool, handleAxiomMcpGoals } from '../src/tools/axiom-mcp-goals.js';
import { axiomMcpMergeTool, handleAxiomMcpMerge } from '../src/tools/axiom-mcp-merge.js';
import { axiomMcpEvaluateTool, handleAxiomMcpEvaluate } from '../src/tools/axiom-mcp-evaluate.js';
import { axiomMcpTestGuidanceTool, handleAxiomMcpTestGuidance } from '../src/tools/axiom-mcp-test-guidance.js';
import { axiomMcpImplementTool, handleAxiomMcpImplement } from '../src/tools/axiom-mcp-implement.js';
import { axiomMcpVisualizeTool, handleAxiomMcpVisualize } from '../src/tools/axiom-mcp-visualize.js';
import { axiomMcpVerifyTool, handleAxiomMcpVerify } from '../src/tools/axiom-mcp-verify.js';
import { axiomMcpDocsTool, handleAxiomMcpDocs } from '../src/tools/axiom-mcp-docs.js';
import { EventBus, EventType } from './core/event-bus.js';
import { z } from 'zod';
import { StatusManager } from '../src/status-manager.js';
// V3 subprocess wrapper that uses PTY instead of execSync
import { ClaudeCodeSubprocessV3 } from './claude-subprocess-v3.js';
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
// Import context manager
import { ContextManager } from '../src/context-manager.js';
// Initialize shared instances
const contextManager = new ContextManager();
// Initialize context managers
initChainContextManager(contextManager);
initializeSynthesisContextManager(contextManager);
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
    axiomMcpGoalTool,
    axiomMcpExploreTool,
    axiomMcpChainTool,
    axiomMcpSynthesisTool,
    axiomMcpStatusTool,
    axiomMcpSpawnTool,
    axiomMcpSpawnMctsTool,
    axiomMcpSpawnStreamingTool,
    axiomMcpTreeTool,
    axiomMcpGoalsTool,
    axiomMcpMergeTool,
    axiomMcpEvaluateTool,
    axiomMcpTestGuidanceTool,
    axiomMcpImplementTool,
    axiomMcpVisualizeTool,
    axiomMcpVerifyTool,
    axiomMcpDocsTool,
];
// Handler map
const handlers = {
    axiom_mcp_goal: handleAxiomMcpGoal,
    axiom_mcp_explore: handleAxiomMcpExplore,
    axiom_mcp_chain: handleAxiomMcpChain,
    axiom_mcp_synthesis: handleAxiomMcpSynthesis,
    axiom_mcp_status: handleAxiomMcpStatus,
    axiom_mcp_spawn: handleAxiomMcpSpawn,
    axiom_mcp_spawn_mcts: handleAxiomMcpSpawnMcts,
    axiom_mcp_spawn_streaming: handleAxiomMcpSpawnStreaming,
    axiom_mcp_tree: handleAxiomMcpTree,
    axiom_mcp_goals: handleAxiomMcpGoals,
    axiom_mcp_merge: handleAxiomMcpMerge,
    axiom_mcp_evaluate: handleAxiomMcpEvaluate,
    axiom_mcp_test_guidance: handleAxiomMcpTestGuidance,
    axiom_mcp_implement: handleAxiomMcpImplement,
    axiom_mcp_visualize: handleAxiomMcpVisualize,
    axiom_mcp_verify: handleAxiomMcpVerify,
    axiom_mcp_docs: handleAxiomMcpDocs,
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
        const result = await handler(args || {}, claudeCode, statusManager, contextManager);
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