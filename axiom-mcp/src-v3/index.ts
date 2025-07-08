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
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import v3 tools only
import {
  axiomMcpSpawnTool,
  handleAxiomMcpSpawn
} from './tools/axiom-mcp-spawn.js';

// Import v3 test tool
import {
  axiomTestV3Tool,
  handleAxiomTestV3
} from './tools/axiom-test-v3.js';

// Import v3 observability and principles tools
import {
  axiomMcpObserveTool,
  handleAxiomMcpObserve
} from './tools/axiom-mcp-observe.js';
import {
  axiomMcpPrinciplesTool,
  handleAxiomMcpPrinciples
} from './tools/axiom-mcp-principles.js';

// Import new management tools
import {
  axiomMcpLogsTool,
  handleAxiomMcpLogs
} from './tools/axiom-mcp-logs.js';
import {
  axiomMcpSettingsTool,
  handleAxiomMcpSettings
} from './tools/axiom-mcp-settings.js';
import {
  axiomMcpStatusTool,
  handleAxiomMcpStatus
} from './tools/axiom-mcp-status.js';

// Import v2 components
import { PtyExecutor } from './executors/pty-executor.js';
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
let conversationDB: ConversationDB | null = null;

async function initializeDB() {
  try {
    conversationDB = new ConversationDB('./axiom-v3.db');
    await conversationDB.initialize();
    console.error('[DB] Initialized successfully');
  } catch (error) {
    console.error('[DB] Failed to initialize:', error);
  }
}

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
  axiomMcpLogsTool,
  axiomMcpSettingsTool,
  axiomMcpStatusTool,
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('[MCP] tools/list called');
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error(`[MCP] tools/call: ${request.params.name}`);
  const { name, arguments: args } = request.params;
  
  try {
    // Log tool call
    eventBus.logEvent({
      taskId: 'system',
      workerId: 'main',
      event: EventType.TOOL_CALL,
      payload: { tool: name, args }
    });
    
    // Handle each tool directly here to match MCP protocol
    switch (name) {
      case 'axiom_mcp_spawn':
        return await handleAxiomMcpSpawn(args || {}, statusManager, conversationDB);
      
      case 'axiom_test_v3':
        return await handleAxiomTestV3(args || {}, claudeCode);
      
      case 'axiom_mcp_observe':
        return await handleAxiomMcpObserve(args || {}, conversationDB);
      
      case 'axiom_mcp_principles':
        return await handleAxiomMcpPrinciples(args || {}, conversationDB);
      
      case 'axiom_mcp_logs':
        return await handleAxiomMcpLogs(args || {});
      
      case 'axiom_mcp_settings':
        return await handleAxiomMcpSettings(args || {});
      
      case 'axiom_mcp_status':
        return await handleAxiomMcpStatus(args || {}, statusManager, conversationDB, eventBus);
      
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error: any) {
    console.error(`[MCP] Tool error: ${error.message}`);
    eventBus.logEvent({
      taskId: 'system',
      workerId: 'main',
      event: EventType.TOOL_ERROR,
      payload: { tool: name, error: error.message }
    });
    
    // Return error in MCP format
    return {
      result: {
        content: [{
          type: 'text',
          text: `Error: ${error.message}`
        }],
        isError: true
      }
    };
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
  
  // Initialize database before starting server
  await initializeDB();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Axiom MCP v3 ready!');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});