import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GeminiStreamingIntegration } from '../gemini-streaming.js';

export const consultGeminiStreamSchema = z.object({
  query: z.string().describe('The question to ask Gemini'),
  context: z.string().optional().describe('Additional context for the query'),
});

export type ConsultGeminiStreamInput = z.infer<typeof consultGeminiStreamSchema>;

export const consultGeminiStreamTool = {
  name: 'consult_gemini_stream',
  description: 'Consult Gemini with streaming responses for real-time feedback',
  inputSchema: zodToJsonSchema(consultGeminiStreamSchema),
};

export async function handleConsultGeminiStream(
  input: ConsultGeminiStreamInput,
  geminiStreaming: GeminiStreamingIntegration
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const chunks: string[] = [];
  let hasError = false;
  let errorMessage = '';

  return new Promise((resolve) => {
    const streamingOptions = {
      onData: (chunk: string) => {
        chunks.push(chunk);
      },
      onError: (error: Error) => {
        hasError = true;
        errorMessage = error.message;
      },
      onEnd: () => {
        if (hasError) {
          resolve({
            content: [
              {
                type: 'text',
                text: `Error during streaming consultation: ${errorMessage}`,
              },
            ],
          });
        } else {
          const fullResponse = chunks.join('');
          resolve({
            content: [
              {
                type: 'text',
                text: `**Gemini Response (Streamed):**\n${fullResponse}\n\n*Model: gemini-2.5-pro | Streaming enabled*`,
              },
            ],
          });
        }
      },
    };

    // Start streaming consultation
    geminiStreaming.consultGeminiStream(
      input.query,
      input.context,
      streamingOptions
    ).catch((error) => {
      resolve({
        content: [
          {
            type: 'text',
            text: `Error starting streaming consultation: ${error.message}`,
          },
        ],
      });
    });
  });
}