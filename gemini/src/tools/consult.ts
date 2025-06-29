import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GeminiIntegration } from '../gemini-integration.js';

export const consultGeminiSchema = z.object({
  query: z.string().describe('The question to ask Gemini'),
  context: z.string().optional().describe('Additional context for the query'),
});

export type ConsultGeminiInput = z.infer<typeof consultGeminiSchema>;

export const consultGeminiTool = {
  name: 'consult_gemini',
  description: 'Consult Gemini for a second opinion on technical questions',
  inputSchema: zodToJsonSchema(consultGeminiSchema),
};

export async function handleConsultGemini(
  input: ConsultGeminiInput,
  gemini: GeminiIntegration
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const result = await gemini.consultGemini(input.query, input.context);

  if (result.error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error consulting Gemini: ${result.error}`,
        },
      ],
    };
  }

  const response = [
    `**Gemini Response:**\n${result.response}`,
    `\n*Model: ${result.model} | Execution time: ${result.executionTime}ms*`,
  ].join('\n');

  return {
    content: [
      {
        type: 'text',
        text: response,
      },
    ],
  };
}