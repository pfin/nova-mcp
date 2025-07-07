#!/usr/bin/env node
/**
 * Axiom MCP v4 - Hook-First Architecture
 * Everything flows through the HookOrchestrator
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { HookOrchestrator } from './core/hook-orchestrator.js';
import { logDebug, getLogFile } from './core/simple-logger.js';
import * as fs from 'fs/promises';
// Import real components
import { ConversationDB } from './database/conversation-db.js';
import { EventBus } from './core/event-bus.js';
import { PtyExecutor } from './executors/pty-executor.js';
import { StatusManager } from './managers/status-manager.js';
// Import built-in hooks
import validationHook from './hooks/validation-hook.js';
import verboseMonitorHook from './hooks/verbose-monitor-hook.js';
import interventionHook from './hooks/intervention-hook.js';
import parallelExecutionHook from './hooks/parallel-execution-hook.js';
import websocketMonitorHook from './hooks/websocket-monitor-hook.js';
import universalPrinciplesHook from './hooks/universal-principles-hook.js';
// Import enhanced hooks
import enhancedVerboseHook from './hooks/enhanced-verbose-hook.js';
import interruptHandlerHook from './hooks/interrupt-handler-hook.js';
import monitoringDashboardHook from './hooks/monitoring-dashboard-hook.js';
import taskDecompositionHook from './hooks/task-decomposition-hook.js';
import databaseTrackingHook from './hooks/database-tracking-hook.js';
async function main() {
    logDebug('MAIN', 'Starting Axiom v4 MCP server');
    try {
        // Initialize real components
        logDebug('MAIN', 'Initializing components');
        const db = new ConversationDB();
        const eventBus = new EventBus();
        const statusManager = new StatusManager();
        await db.initialize();
        await eventBus.initialize();
        logDebug('MAIN', 'Components initialized');
        // Create the orchestrator - the heart of v4
        const orchestrator = new HookOrchestrator(db, eventBus, statusManager);
        // Set orchestrator on components for bidirectional communication
        db.setHookOrchestrator(orchestrator);
        eventBus.setHookOrchestrator(orchestrator);
        statusManager.setHookOrchestrator(orchestrator);
        // Register built-in hooks
        orchestrator.registerHook(validationHook);
        orchestrator.registerHook(verboseMonitorHook);
        orchestrator.registerHook(interventionHook);
        orchestrator.registerHook(parallelExecutionHook);
        orchestrator.registerHook(websocketMonitorHook);
        orchestrator.registerHook(universalPrinciplesHook);
        // Register enhanced hooks for maximum visibility
        orchestrator.registerHook(databaseTrackingHook); // CRITICAL - populate database!
        orchestrator.registerHook(taskDecompositionHook); // Run early to decompose
        orchestrator.registerHook(enhancedVerboseHook);
        orchestrator.registerHook(interruptHandlerHook);
        orchestrator.registerHook(monitoringDashboardHook);
        // Register PTY executor for real streaming
        const ptyExecutor = new PtyExecutor({
            enableMonitoring: true,
            hookOrchestrator: orchestrator
        });
        orchestrator.registerExecutor('axiom_spawn', ptyExecutor);
        // Create MCP server
        const server = new Server({
            name: 'axiom-mcp-v4',
            version: '4.0.0',
        }, {
            capabilities: {
                tools: {},
                resources: {},
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
                    {
                        name: 'axiom_send',
                        description: 'Send a message/command to a running task',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                taskId: {
                                    type: 'string',
                                    description: 'Task ID to send message to',
                                },
                                message: {
                                    type: 'string',
                                    description: 'Message or command to send',
                                },
                            },
                            required: ['taskId', 'message'],
                        },
                    },
                    {
                        name: 'axiom_status',
                        description: 'Check status of running tasks',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                taskId: {
                                    type: 'string',
                                    description: 'Specific task ID (optional, shows all if not provided)',
                                },
                            },
                        },
                    },
                    {
                        name: 'axiom_output',
                        description: 'Get accumulated output from a task',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                taskId: {
                                    type: 'string',
                                    description: 'Task ID to get output from',
                                },
                                tail: {
                                    type: 'number',
                                    description: 'Number of last lines to return (optional)',
                                },
                            },
                            required: ['taskId'],
                        },
                    },
                ],
            };
        });
        // Tool execution
        server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name === 'axiom_spawn') {
                try {
                    // Log to file
                    logDebug('MCP', 'axiom_spawn called with args:', request.params.arguments);
                    // ALL execution goes through the orchestrator
                    const result = await orchestrator.handleRequest('axiom_spawn', request.params.arguments);
                    logDebug('MCP', `axiom_spawn returned: ${typeof result}`, result);
                    // Handle different result types
                    let textResponse;
                    if (typeof result === 'string') {
                        textResponse = result;
                    }
                    else if (result && typeof result === 'object') {
                        // For verbose mode, return a formatted response
                        textResponse = JSON.stringify(result, null, 2);
                    }
                    else {
                        textResponse = String(result);
                    }
                    logDebug('MCP', 'Returning MCP response with text:', textResponse.slice(0, 100));
                    return {
                        content: [
                            {
                                type: 'text',
                                text: textResponse,
                            },
                        ],
                    };
                }
                catch (error) {
                    logDebug('MCP', 'Error in axiom_spawn handler', {
                        message: error.message,
                        stack: error.stack
                    });
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
            if (request.params.name === 'axiom_send') {
                try {
                    logDebug('MCP', 'axiom_send called with args:', request.params.arguments);
                    const args = request.params.arguments;
                    const { taskId, message } = args;
                    const task = orchestrator.getActiveTask(taskId);
                    if (!task || task.status !== 'running') {
                        return {
                            content: [{
                                    type: 'text',
                                    text: `Task ${taskId} is not running or not found`
                                }],
                        };
                    }
                    // Send message to the task's executor
                    if (task.executor && task.executor.write) {
                        task.executor.write(message + '\n');
                        logDebug('MCP', `Sent message to task ${taskId}:`, message);
                        return {
                            content: [{
                                    type: 'text',
                                    text: `Message sent to ${taskId}: ${message}`
                                }],
                        };
                    }
                    else {
                        return {
                            content: [{
                                    type: 'text',
                                    text: `Task ${taskId} does not support message input`
                                }],
                        };
                    }
                }
                catch (error) {
                    return {
                        content: [{
                                type: 'text',
                                text: `Error: ${error.message}`
                            }],
                        isError: true,
                    };
                }
            }
            if (request.params.name === 'axiom_output') {
                try {
                    const args = request.params.arguments;
                    const { taskId, tail } = args;
                    const task = orchestrator.getActiveTask(taskId);
                    if (!task) {
                        return {
                            content: [{
                                    type: 'text',
                                    text: `Task ${taskId} not found`
                                }],
                        };
                    }
                    let output = task.output || '';
                    // If tail is specified, return last N lines
                    if (tail && tail > 0) {
                        const lines = output.split('\n');
                        const startIdx = Math.max(0, lines.length - tail);
                        output = lines.slice(startIdx).join('\n');
                    }
                    return {
                        content: [{
                                type: 'text',
                                text: output || '(no output yet)'
                            }],
                    };
                }
                catch (error) {
                    return {
                        content: [{
                                type: 'text',
                                text: `Error: ${error.message}`
                            }],
                        isError: true,
                    };
                }
            }
            if (request.params.name === 'axiom_status') {
                try {
                    const { taskId } = request.params.arguments || {};
                    if (taskId) {
                        // Get specific task
                        const task = orchestrator.getActiveTask(taskId);
                        if (!task) {
                            return {
                                content: [{
                                        type: 'text',
                                        text: `Task ${taskId} not found`
                                    }],
                            };
                        }
                        const runtime = Date.now() - task.startTime;
                        const status = `[${taskId}] ${task.status.toUpperCase()}\nPrompt: ${task.prompt.slice(0, 50)}...\nRuntime: ${runtime}ms\nOutput lines: ${task.output.split('\n').length}`;
                        return {
                            content: [{
                                    type: 'text',
                                    text: status
                                }],
                        };
                    }
                    else {
                        // Get all tasks
                        const tasks = orchestrator.getAllActiveTasks();
                        if (tasks.length === 0) {
                            return {
                                content: [{
                                        type: 'text',
                                        text: 'No active tasks'
                                    }],
                            };
                        }
                        const summary = tasks.map(task => {
                            const runtime = task.endTime ? task.endTime - task.startTime : Date.now() - task.startTime;
                            return `[${task.taskId}] ${task.status.toUpperCase()} - ${task.prompt.slice(0, 30)}... (${runtime}ms)`;
                        }).join('\n');
                        return {
                            content: [{
                                    type: 'text',
                                    text: summary
                                }],
                        };
                    }
                }
                catch (error) {
                    return {
                        content: [{
                                type: 'text',
                                text: `Error: ${error.message}`
                            }],
                        isError: true,
                    };
                }
            }
            throw new Error(`Unknown tool: ${request.params.name}`);
        });
        // Resource listing
        server.setRequestHandler(ListResourcesRequestSchema, async () => {
            return {
                resources: [
                    {
                        uri: 'axiom://status',
                        name: 'System Status',
                        description: 'Current Axiom v4 system status',
                        mimeType: 'application/json',
                    },
                    {
                        uri: 'axiom://logs',
                        name: 'Recent Logs',
                        description: 'Recent event logs from Axiom v4',
                        mimeType: 'text/plain',
                    },
                    {
                        uri: 'axiom://debug',
                        name: 'Debug Log',
                        description: 'Current debug log file',
                        mimeType: 'text/plain',
                    },
                    {
                        uri: 'axiom://help',
                        name: 'Axiom v4 Help',
                        description: 'Axiom v4 documentation and usage guide',
                        mimeType: 'text/markdown',
                    },
                ],
            };
        });
        // Resource reading
        server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const { uri } = request.params;
            switch (uri) {
                case 'axiom://status':
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify({
                                    version: '4.0.0',
                                    status: 'operational',
                                    hooks: {
                                        count: 11,
                                        names: [
                                            validationHook.name,
                                            verboseMonitorHook.name,
                                            interventionHook.name,
                                            parallelExecutionHook.name,
                                            websocketMonitorHook.name,
                                            universalPrinciplesHook.name,
                                            databaseTrackingHook.name,
                                            taskDecompositionHook.name,
                                            enhancedVerboseHook.name,
                                            interruptHandlerHook.name,
                                            monitoringDashboardHook.name,
                                        ],
                                    },
                                    database: db ? 'connected' : 'disconnected',
                                    executors: ['axiom_spawn'],
                                }, null, 2),
                            },
                        ],
                    };
                case 'axiom://logs':
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'text/plain',
                                text: 'Axiom v4 uses enhanced logging. Set AXIOM_LOG_LEVEL=TRACE for detailed logs.',
                            },
                        ],
                    };
                case 'axiom://debug':
                    try {
                        const logContent = await fs.readFile(getLogFile(), 'utf-8');
                        return {
                            contents: [
                                {
                                    uri,
                                    mimeType: 'text/plain',
                                    text: logContent || 'No debug logs yet.',
                                },
                            ],
                        };
                    }
                    catch (err) {
                        return {
                            contents: [
                                {
                                    uri,
                                    mimeType: 'text/plain',
                                    text: `Debug log file: ${getLogFile()}\nError reading: ${err}`,
                                },
                            ],
                        };
                    }
                case 'axiom://help':
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'text/markdown',
                                text: `# Axiom v4 - Hook-First Architecture

## Usage

\`\`\`typescript
axiom_spawn({
  prompt: "Your task here",
  verboseMasterMode: true,  // Enable enhanced monitoring
  spawnPattern: "single",   // or "parallel"
  spawnCount: 1            // For parallel execution
})
\`\`\`

## Features

- **Validation Hook**: Ensures concrete deliverables
- **Enhanced Verbose Mode**: Maximum visibility with pattern detection
- **Interrupt Handling**: Real-time command injection
- **Monitoring Dashboard**: Live execution metrics
- **Hook-First Design**: Everything flows through hooks

## Interrupt Commands

- \`[INTERRUPT: CHANGE TO JAVA]\` - Switch to Java implementation
- \`[INTERRUPT: CHANGE TO PYTHON]\` - Switch to Python implementation
- \`[INTERRUPT: STOP]\` - Stop execution
- \`[INTERRUPT: ADD TESTS]\` - Add unit tests
- \`[INTERRUPT: EXPLAIN]\` - Explain current actions
`,
                            },
                        ],
                    };
                default:
                    throw new Error(`Unknown resource: ${uri}`);
            }
        });
        // Start the server
        const transport = new StdioServerTransport();
        await server.connect(transport);
        // Only log startup messages in debug mode
        if (process.env.AXIOM_LOG_LEVEL === 'DEBUG' || process.env.AXIOM_LOG_LEVEL === 'TRACE') {
            console.error('[Axiom v4] Hook-first MCP server started');
            console.error('[Axiom v4] Database:', db.constructor.name);
            console.error('[Axiom v4] Executor:', ptyExecutor.constructor.name);
            console.error('[Axiom v4] Registered hooks:', [
                validationHook.name,
                verboseMonitorHook.name,
                interventionHook.name,
                parallelExecutionHook.name,
                websocketMonitorHook.name,
                universalPrinciplesHook.name,
                taskDecompositionHook.name,
                enhancedVerboseHook.name,
                interruptHandlerHook.name,
                monitoringDashboardHook.name
            ].join(', '));
        }
    }
    catch (error) {
        throw error;
    }
}
// Start immediately
main().catch((error) => {
    logDebug('MAIN', 'Fatal error caught', {
        message: error.message,
        stack: error.stack
    });
    // Only log fatal errors
    if (!process.env.AXIOM_SILENT) {
        console.error('Fatal error:', error);
    }
    process.exit(1);
});
//# sourceMappingURL=index.js.map