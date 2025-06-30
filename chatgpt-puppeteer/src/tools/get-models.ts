import { ChatGPTClient } from '../chatgpt-client.js';

export const getModelsTool = {
  name: 'chatgpt_get_models',
  description: 'Get a list of available ChatGPT models',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function handleGetModels(
  client: ChatGPTClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Initialize if needed
    if (!client.isReady()) {
      await client.initialize();
    }

    const models = await client.getAvailableModels();

    const modelsText = models.length > 0
      ? `**Available ChatGPT Models:**\n${models.map(m => `- ${m}`).join('\n')}`
      : 'No models found. Make sure you are logged in to ChatGPT.';

    return {
      content: [
        {
          type: 'text',
          text: modelsText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting models: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}