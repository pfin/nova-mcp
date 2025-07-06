import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ChatGPTClientEnhanced } from '../chatgpt-client-enhanced.js';

export const chatgptAskSchema = z.object({
  query: z.string().describe('The question to ask ChatGPT'),
  model: z.string().optional().describe('Specific model to use (e.g., "gpt-4", "gpt-4o", "gpt-3.5-turbo")'),
  newConversation: z.boolean().optional().default(false).describe('Start a new conversation'),
});

export type ChatGPTAskInput = z.infer<typeof chatgptAskSchema>;

export const chatgptAskTool = {
  name: 'chatgpt_ask',
  description: 'Send a question to ChatGPT and get a response',
  inputSchema: zodToJsonSchema(chatgptAskSchema),
};

export async function handleChatGPTAsk(
  input: ChatGPTAskInput,
  client: ChatGPTClientEnhanced
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Initialize if needed
    if (!client.isReady()) {
      await client.initialize();
    }

    // Start new conversation if requested
    if (input.newConversation) {
      await client.clearConversation();
    }

    // Select model if specified
    if (input.model) {
      await client.selectModel(input.model);
    }

    // Send the message and get response
    const response = await client.sendMessage(input.query);

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}