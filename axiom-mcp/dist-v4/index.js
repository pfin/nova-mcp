/**
 * Axiom MCP v4 - Hook-First Architecture
 * Everything flows through the HookOrchestrator
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { HookOrchestrator } from './core/hook-orchestrator.js';
// Import built-in hooks
import validationHook from './hooks/validation-hook.js';
import verboseMonitorHook from './hooks/verbose-monitor-hook.js';
import interventionHook from './hooks/intervention-hook.js';
import parallelExecutionHook from './hooks/parallel-execution-hook.js';
import websocketMonitorHook from './hooks/websocket-monitor-hook.js';
// Simple implementations for demo
class SimpleDB {
    async init() { }
    async createConversation(data) { return { id: `conv-${Date.now()}` }; }
    async logAction(data) { }
}
class SimpleEventBus {
    logEvent(event) {
        console.error(`[EventBus] ${event.event}:`, event.payload);
    }
}
// Simple PTY executor for demo
class SimplePTYExecutor {
    async execute(args, streamHandler) {
        const { prompt } = args;
        // Simulate execution with streaming
        streamHandler(`Executing: ${prompt}\n`);
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 1000));
        streamHandler('Creating files...\n');
        if (prompt.includes('TODO')) {
            streamHandler('TODO detected in prompt\n');
        }
        streamHandler('Implementation complete!\n');
        return 'Task completed successfully';
    }
    async injectCommand(command) {
        console.error(`[Executor] Injecting command: ${command}`);
    }
}
async function main() {
    // Initialize core components
    const db = new SimpleDB();
    const eventBus = new SimpleEventBus();
    await db.init();
    // Create the orchestrator - the heart of v4
    const orchestrator = new HookOrchestrator(db, eventBus);
    // Register built-in hooks
    orchestrator.registerHook(validationHook);
    orchestrator.registerHook(verboseMonitorHook);
    orchestrator.registerHook(interventionHook);
    orchestrator.registerHook(parallelExecutionHook);
    orchestrator.registerHook(websocketMonitorHook);
    // Register executors
    orchestrator.registerExecutor('axiom_spawn', new SimplePTYExecutor());
    // Create MCP server
    const server = new Server({
        name: 'axiom-mcp-v4',
        version: '4.0.0',
    }, {
        capabilities: {
            tools: {},
        },
    });
    // Tool listing
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: 'axiom_spawn',
                    description: 'Execute a task with hook-based validation and monitoring',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            prompt: {
                                type: 'string',
                                description: 'Task to execute',
                            },
                            verboseMasterMode: {
                                type: 'boolean',
                                description: 'Enable real-time verbose output',
                                default: false,
                            },
                            spawnPattern: {
                                type: 'string',
                                description: 'Execution pattern',
                                enum: ['single', 'parallel'],
                                default: 'single',
                            },
                            spawnCount: {
                                type: 'number',
                                description: 'Number of parallel executions',
                                default: 1,
                            },
                        },
                        required: ['prompt'],
                    },
                },
            ],
        };
    });
    // Tool execution
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (request.params.name === 'axiom_spawn') {
            try {
                // ALL execution goes through the orchestrator
                const result = await orchestrator.handleRequest('axiom_spawn', request.params.arguments);
                return {
                    content: [
                        {
                            type: 'text',
                            text: result,
                        },
                    ],
                };
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
        throw new Error(`Unknown tool: ${request.params.name}`);
    });
    // Start the server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[Axiom v4] Hook-first MCP server started');
    console.error('[Axiom v4] Registered hooks:', [
        validationHook.name,
        verboseMonitorHook.name,
        interventionHook.name,
        parallelExecutionHook.name,
        websocketMonitorHook.name
    ].join(', '));
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map