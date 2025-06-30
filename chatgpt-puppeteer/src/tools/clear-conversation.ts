import { ChatGPTClient } from '../chatgpt-client.js';

export const clearConversationTool = {
  name: 'chatgpt_clear_conversation',
  description: 'Clear the current ChatGPT conversation and start fresh',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function handleClearConversation(
  client: ChatGPTClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Initialize if needed
    if (!client.isReady()) {
      await client.initialize();
    }

    await client.clearConversation();

    return {
      content: [
        {
          type: 'text',
          text: 'Conversation cleared. Ready for a new chat.',
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error clearing conversation: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}