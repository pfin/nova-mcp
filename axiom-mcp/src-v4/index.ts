/**
 * Axiom MCP v4 - Hook-First Architecture
 * Everything flows through the HookOrchestrator
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { HookOrchestrator } from './core/hook-orchestrator.js';

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

async function main() {
  // Initialize real components
  const db = new ConversationDB();
  const eventBus = new EventBus();
  const statusManager = new StatusManager();
  
  await db.initialize();
  await eventBus.initialize();
  
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
  
  // Register real executor
  const ptyExecutor = new PtyExecutor({ 
    enableMonitoring: true,
    hookOrchestrator: orchestrator
  });
  orchestrator.registerExecutor('axiom_spawn', ptyExecutor);
  
  // Create MCP server
  const server = new Server(
    {
      name: 'axiom-mcp-v4',
      version: '4.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  
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
      } catch (error: any) {
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
  console.error('[Axiom v4] Database:', db.constructor.name);
  console.error('[Axiom v4] Executor:', ptyExecutor.constructor.name);
  console.error('[Axiom v4] Registered hooks:', [
    validationHook.name,
    verboseMonitorHook.name,
    interventionHook.name,
    parallelExecutionHook.name,
    websocketMonitorHook.name,
    universalPrinciplesHook.name
  ].join(', '));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});