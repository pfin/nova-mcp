import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ChatGPTClientEnhanced } from '../chatgpt-client-enhanced.js';

export const compareModelsSchema = z.object({
  query: z.string().describe('The question to ask all models'),
  models: z.array(z.string()).describe('Array of model names to compare'),
});

export type CompareModelsInput = z.infer<typeof compareModelsSchema>;

export const compareModelsTool = {
  name: 'chatgpt_compare_models',
  description: 'Ask the same question to multiple ChatGPT models and compare responses',
  inputSchema: zodToJsonSchema(compareModelsSchema),
};

export async function handleCompareModels(
  input: CompareModelsInput,
  client: ChatGPTClientEnhanced
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Initialize if needed
    if (!client.isReady()) {
      await client.initialize();
    }

    // Compare models
    const responses = await client.compareModels(input.query, input.models);

    // Format the comparison
    let comparisonText = `**Model Comparison for Query:** "${input.query}"\n\n`;
    
    for (const [model, response] of Object.entries(responses)) {
      comparisonText += `### ${model}\n\n${response}\n\n---\n\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text: comparisonText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error comparing models: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}