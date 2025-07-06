#!/usr/bin/env node

/**
 * Axiom MCP v3 - Standalone Implementation
 * 
 * A complete rewrite that:
 * - Uses PTY executor to prevent timeouts
 * - Forces actual code implementation
 * - Monitors and intervenes in real-time
 * - No dependencies on v1
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import v3 components ONLY
import { axiomMcpSpawnTool, handleAxiomMcpSpawn } from './tools/axiom-mcp-spawn.js';
import { axiomMcpObserveTool, handleAxiomMcpObserve } from './tools/axiom-mcp-observe.js';
import { axiomMcpPrinciplesTool, handleAxiomMcpPrinciples } from './tools/axiom-mcp-principles.js';
import { StatusManager } from './managers/status-manager.js';
import { EventLogger } from './logging/event-logger.js';
import { ConversationDB } from './database/conversation-db.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize components
const statusManager = new StatusManager();
const eventLogger = new EventLogger();
const conversationDB = new ConversationDB();

// Initialize database
conversationDB.initialize().then(() => {
  console.error('[AXIOM v3] Database initialized');
}).catch(err => {
  console.error('[AXIOM v3] Database initialization failed:', err);
});

// Log startup
console.error('[AXIOM v3] Starting Axiom MCP v3 Standalone Server');
console.error('[AXIOM v3] This version forces implementation over planning');

// Create MCP server
const server = new Server(
  {
    name: 'axiom-mcp-v3',
    version: '3.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool handlers - v3 only
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      axiomMcpSpawnTool,
      axiomMcpObserveTool,
      axiomMcpPrinciplesTool,
      // We'll add more v3 tools as we build them
      {
        name: 'axiom_mcp_status',
        description: 'Check current execution status and recent tasks',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['current', 'recent', 'stats'],
              description: 'Status action to perform'
            },
            limit: {
              type: 'number',
              default: 10,
              description: 'Number of recent tasks to show'
            }
          },
          required: ['action']
        }
      }
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  eventLogger.logEvent({
    type: 'tool_call',
    tool: name,
    arguments: args,
    timestamp: Date.now(),
  });
  
  try {
    switch (name) {
      case 'axiom_mcp_spawn':
        return await handleAxiomMcpSpawn(args as any, statusManager, conversationDB);
        
      case 'axiom_mcp_observe':
        return await handleAxiomMcpObserve(args as any, conversationDB);
        
      case 'axiom_mcp_principles':
        return await handleAxiomMcpPrinciples(args as any, conversationDB);
        
      case 'axiom_mcp_status':
        return handleAxiomMcpStatusV3(args as any, statusManager);
        
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    eventLogger.logEvent({
      type: 'tool_error',
      tool: name,
      error: error instanceof Error ? error.message : String(error),
      timestamp: Date.now(),
    });
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Simple status handler for v3
function handleAxiomMcpStatusV3(
  args: { action: string; limit?: number },
  statusManager: StatusManager
): { content: Array<{ type: string; text: string }> } {
  const { action, limit = 10 } = args;
  
  switch (action) {
    case 'current': {
      const tasks = statusManager.getActiveTasks();
      return {
        content: [{
          type: 'text',
          text: `# Current Active Tasks\n\n${
            tasks.length === 0 
              ? 'No active tasks' 
              : tasks.map(t => `- [${t.status}] ${t.id}: ${t.prompt.substring(0, 50)}...`).join('\n')
          }`
        }]
      };
    }
    
    case 'recent': {
      const tasks = statusManager.getRecentTasks(limit);
      return {
        content: [{
          type: 'text',
          text: `# Recent Tasks (Last ${limit})\n\n${
            tasks.map(t => {
              const filesCreated = t.metadata?.filesCreated?.length || 0;
              return `- [${t.status}] ${t.prompt.substring(0, 50)}... (${filesCreated} files created)`;
            }).join('\n')
          }`
        }]
      };
    }
    
    case 'stats': {
      const stats = statusManager.getStats();
      return {
        content: [{
          type: 'text',
          text: `# Axiom v3 Statistics\n\n` +
            `Total Tasks: ${stats.total}\n` +
            `Completed: ${stats.completed}\n` +
            `Failed: ${stats.failed}\n` +
            `Running: ${stats.running}\n` +
            `Success Rate: ${stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%\n`
        }]
      };
    }
    
    default:
      throw new Error(`Unknown status action: ${action}`);
  }
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[AXIOM v3] Server started successfully');
  console.error('[AXIOM v3] Ready to execute tasks with PTY');
}

main().catch((error) => {
  console.error('[AXIOM v3] Fatal error:', error);
  process.exit(1);
});