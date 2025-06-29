import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GeminiIntegration } from '../gemini-integration.js';

export const toggleAutoConsultSchema = z.object({
  enable: z.boolean().describe('Enable or disable automatic consultation'),
});

export type ToggleAutoConsultInput = z.infer<typeof toggleAutoConsultSchema>;

export const toggleAutoConsultTool = {
  name: 'toggle_gemini_auto_consult',
  description: 'Enable or disable automatic consultation when uncertainty is detected',
  inputSchema: zodToJsonSchema(toggleAutoConsultSchema),
};

export async function handleToggleAutoConsult(
  input: ToggleAutoConsultInput,
  gemini: GeminiIntegration
): Promise<{ content: Array<{ type: string; text: string }> }> {
  gemini.toggleAutoConsult(input.enable);

  const message = input.enable
    ? '✅ Automatic Gemini consultation has been enabled. Gemini will be consulted when uncertainty is detected.'
    : '❌ Automatic Gemini consultation has been disabled. Use the consult_gemini tool for manual consultations.';

  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
  };
}