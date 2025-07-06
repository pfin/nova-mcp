#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { ChatGPTClientEnhanced } from './chatgpt-client-enhanced.js';
import type { ChatGPTClient, ChatGPTClientWithSession } from './chatgpt-client-interface.js';
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
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize ChatGPT client based on configuration
const useUnderground = process.env.CHATGPT_USE_UNDERGROUND === 'true';
const useRemote = process.env.CHATGPT_USE_REMOTE === 'true' || process.env.CHROME_DEBUG_PORT;
const useHybrid = process.env.CHATGPT_USE_HYBRID === 'true';
let chatgptClient: ChatGPTClient & Partial<ChatGPTClientWithSession>;

if (useUnderground) {
  console.error('🌟 Using Nova Underground ChatGPT client...');
  const { ChatGPTClientNovaUnderground } = await import('./chatgpt-client-nova-underground.js');
  chatgptClient = new ChatGPTClientNovaUnderground();
} else if (useRemote) {
  console.error('Using remote Chrome connection...');
  const { ChatGPTClientRemote } = await import('./chatgpt-client-remote.js');
  chatgptClient = new ChatGPTClientRemote({
    debugPort: parseInt(process.env.CHROME_DEBUG_PORT || '9225'),
    timeout: parseInt(process.env.CHATGPT_TIMEOUT || '60000'),
    defaultModel: process.env.CHATGPT_MODEL || 'gpt-4o',
  });
} else if (useHybrid) {
  console.error('Using hybrid ChatGPT client...');
  const { ChatGPTClientHybrid } = await import('./chatgpt-client-hybrid.js');
  chatgptClient = new ChatGPTClientHybrid();
} else {
  console.error('Using enhanced ChatGPT client...');
  chatgptClient = new ChatGPTClientEnhanced();
}

// Set up event listeners
chatgptClient.on('auth-required', () => {
  console.error('Authentication required. Please log in to ChatGPT in the browser window.');
});

chatgptClient.on('initialized', () => {
  console.error('ChatGPT client initialized successfully');
});

chatgptClient.on('connected', () => {
  console.error('Connected to remote Chrome instance');
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
        return await handleChatGPTAsk(input, chatgptClient as ChatGPTClientEnhanced);
      }

      case 'chatgpt_compare_models': {
        const input = z.object({
          query: z.string(),
          models: z.array(z.string()),
        }).parse(args);
        return await handleCompareModels(input, chatgptClient as ChatGPTClientEnhanced);
      }

      case 'chatgpt_select_model': {
        const input = z.object({
          model: z.string(),
        }).parse(args);
        return await handleSelectModel(input, chatgptClient as ChatGPTClientEnhanced);
      }

      case 'chatgpt_get_models': {
        return await handleGetModels(chatgptClient as ChatGPTClientEnhanced);
      }

      case 'chatgpt_clear_conversation': {
        return await handleClearConversation(chatgptClient as ChatGPTClientEnhanced);
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
  if ('saveSession' in chatgptClient && chatgptClient.saveSession) {
    await chatgptClient.saveSession();
  }
  if ('disconnect' in chatgptClient && chatgptClient.disconnect) {
    await chatgptClient.disconnect();
  } else {
    await chatgptClient.close();
  }
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