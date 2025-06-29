import { GeminiIntegration } from '../gemini-integration.js';

export const geminiStatusTool = {
  name: 'gemini_status',
  description: 'Check the current status of the Gemini integration',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function handleGeminiStatus(
  gemini: GeminiIntegration
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const status = gemini.getStatus();

  const statusText = [
    '**Gemini Integration Status:**',
    `- Enabled: ${status.enabled ? '✅' : '❌'}`,
    `- Auto-consultation: ${status.autoConsult ? '✅' : '❌'}`,
    `- Model: ${status.model}`,
    `- Consultations: ${status.consultationCount}`,
    `- Last consultation: ${status.lastConsultation ? status.lastConsultation.toLocaleString() : 'Never'}`,
    `- Rate limit: ${status.rateLimitDelay}s between calls`,
    `- Timeout: ${status.timeout}s`,
  ].join('\n');

  return {
    content: [
      {
        type: 'text',
        text: statusText,
      },
    ],
  };
}