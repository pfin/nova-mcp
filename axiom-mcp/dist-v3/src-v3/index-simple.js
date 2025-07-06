#!/usr/bin/env node
/**
 * Axiom MCP v3 - Simple test to verify PTY works
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { EventBus, EventType } from './core/event-bus.js';
import { ClaudeCodeSubprocessV3 } from './claude-subprocess-v3.js';
// Initialize server
const server = new Server({
    name: 'axiom-mcp-v3',
    version: '3.0.0',
}, {
    capabilities: {
        tools: {},
        logging: {},
    }
});
// Initialize components
const eventBus = new EventBus({ logDir: './logs-v3' });
const claudeCode = new ClaudeCodeSubprocessV3({ eventBus });
// Test tool schema
const testV3Schema = z.object({
    prompt: z.string().describe('The prompt to execute'),
    useStreaming: z.boolean().optional().describe('Use streaming output'),
});
// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [{
                name: 'axiom_test_v3',
                description: 'Test Axiom v3 with PTY executor (no timeout!)',
                inputSchema: zodToJsonSchema(testV3Schema),
            }],
    };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === 'axiom_test_v3') {
        const input = testV3Schema.parse(args);
        eventBus.logEvent({
            taskId: 'test',
            workerId: 'main',
            event: EventType.TOOL_CALL,
            payload: { tool: name, args: input }
        });
        try {
            if (input.useStreaming) {
                // Test streaming
                let streamedOutput = '';
                const result = await claudeCode.executeStreaming(input.prompt, (data) => {
                    streamedOutput += data;
                    console.error(`[STREAM] ${data}`);
                });
                return {
                    content: [{
                            type: 'text',
                            text: `Streaming completed!\nDuration: ${result.duration}ms\nOutput length: ${streamedOutput.length} chars\n\nResult:\n${result.response}`
                        }]
                };
            }
            else {
                // Test regular execution
                const result = await claudeCode.execute(input.prompt);
                return {
                    content: [{
                            type: 'text',
                            text: `Task completed!\nDuration: ${result.duration}ms\nNo timeout occurred!\n\nResult:\n${result.response}`
                        }]
                };
            }
        }
        catch (error) {
            eventBus.logEvent({
                taskId: 'test',
                workerId: 'main',
                event: EventType.TOOL_ERROR,
                payload: { error: error.message }
            });
            return {
                content: [{
                        type: 'text',
                        text: `Error: ${error.message}`
                    }],
                isError: true
            };
        }
    }
    throw new Error(`Unknown tool: ${name}`);
});
// Logging handler
server.setRequestHandler(z.object({ method: z.literal('logging/levels') }), async () => {
    return { levels: ['debug', 'info', 'warning', 'error'] };
});
// Start server
async function main() {
    console.error('Axiom MCP v3 Test Server starting...');
    console.error('- PTY executor prevents timeouts');
    console.error('- Test with axiom_test_v3 tool');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Axiom MCP v3 Test Server ready!');
}
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
//# sourceMappingURL=index-simple.js.map