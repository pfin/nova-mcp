#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { ChatGPTClient } from './chatgpt-client.js';
import {
  chatgptAskTool,
  handleChatGPTAsk,
  compareModelsTool,
  handleCompareModels,
  selectModelTool,
  handleSelectModel,
  getModelsTool,
  handleGetModels,
  clearConversationTool,
  handleClearConversation,
} from './tools/index.js';
import { z } from 'zod';

// Initialize ChatGPT client
const chatgptClient = new ChatGPTClient();

// Set up event listeners
chatgptClient.on('auth-required', () => {
  console.error('Authentication required. Please log in to ChatGPT in the browser window.');
});

chatgptClient.on('initialized', () => {
  console.error('ChatGPT client initialized successfully');
});

chatgptClient.on('model-selected', (model) => {
  console.error(`Switched to model: ${model}`);
});

// Create MCP server
const server = new Server(
  {
    name: 'chatgpt-puppeteer',
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
      chatgptAskTool,
      compareModelsTool,
      selectModelTool,
      getModelsTool,
      clearConversationTool,
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'chatgpt_ask': {
        const input = z.object({
          query: z.string(),
          model: z.string().optional(),
          newConversation: z.boolean().optional().default(false),
        }).parse(args);
        return await handleChatGPTAsk(input, chatgptClient);
      }

      case 'chatgpt_compare_models': {
        const input = z.object({
          query: z.string(),
          models: z.array(z.string()),
        }).parse(args);
        return await handleCompareModels(input, chatgptClient);
      }

      case 'chatgpt_select_model': {
        const input = z.object({
          model: z.string(),
        }).parse(args);
        return await handleSelectModel(input, chatgptClient);
      }

      case 'chatgpt_get_models': {
        return await handleGetModels(chatgptClient);
      }

      case 'chatgpt_clear_conversation': {
        return await handleClearConversation(chatgptClient);
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

// Handle shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down ChatGPT Puppeteer server...');
  await chatgptClient.saveSession();
  await chatgptClient.close();
  process.exit(0);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('ChatGPT Puppeteer MCP Server started');
  console.error('Note: Browser will launch on first tool use');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});