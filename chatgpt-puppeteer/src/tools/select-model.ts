import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ChatGPTClient } from '../chatgpt-client.js';

export const selectModelSchema = z.object({
  model: z.string().describe('Model to switch to (e.g., "gpt-4", "gpt-4o", "gpt-3.5-turbo")'),
});

export type SelectModelInput = z.infer<typeof selectModelSchema>;

export const selectModelTool = {
  name: 'chatgpt_select_model',
  description: 'Switch to a different ChatGPT model',
  inputSchema: zodToJsonSchema(selectModelSchema),
};

export async function handleSelectModel(
  input: SelectModelInput,
  client: ChatGPTClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Initialize if needed
    if (!client.isReady()) {
      await client.initialize();
    }

    await client.selectModel(input.model);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully switched to model: ${input.model}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error selecting model: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}