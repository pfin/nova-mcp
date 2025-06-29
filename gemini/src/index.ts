#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { GeminiIntegration } from './gemini-integration.js';
import {
  consultGeminiTool,
  handleConsultGemini,
  geminiStatusTool,
  handleGeminiStatus,
  toggleAutoConsultTool,
  handleToggleAutoConsult,
} from './tools/index.js';
import { z } from 'zod';

// Initialize Gemini integration
const gemini = new GeminiIntegration();

// Create MCP server
const server = new Server(
  {
    name: 'gemini-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      consultGeminiTool,
      geminiStatusTool,
      toggleAutoConsultTool,
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'consult_gemini': {
        const input = z.object({
          query: z.string(),
          context: z.string().optional(),
        }).parse(args);
        return await handleConsultGemini(input, gemini);
      }

      case 'gemini_status': {
        return await handleGeminiStatus(gemini);
      }

      case 'toggle_gemini_auto_consult': {
        const input = z.object({
          enable: z.boolean(),
        }).parse(args);
        return await handleToggleAutoConsult(input, gemini);
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Tool "${name}" not found`
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    throw error;
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log startup status
  console.error(`Gemini MCP Server started`);
  console.error(`Gemini integration: ${gemini.isEnabled() ? 'enabled' : 'disabled'}`);
  console.error(`Auto-consultation: ${gemini.isAutoConsultEnabled() ? 'enabled' : 'disabled'}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});