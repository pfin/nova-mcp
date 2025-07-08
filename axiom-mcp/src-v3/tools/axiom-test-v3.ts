import { z } from 'zod';
import { ClaudeCodeSubprocessV3 } from '../claude-subprocess-v3.js';
import { createMcpCompliantSchema } from '../utils/mcp-schema.js';

// Define the schema separately
const axiomTestV3Schema = z.object({
  prompt: z.string().describe('The prompt to execute'),
  useStreaming: z.boolean().optional().describe('Use streaming output')
});

// Simple test tool for v3
export const axiomTestV3Tool = {
  name: 'axiom_test_v3',
  description: 'Test Axiom v3 with PTY executor (no timeout!)',
  inputSchema: createMcpCompliantSchema(axiomTestV3Schema, 'AxiomTestV3Input')
};

export async function handleAxiomTestV3(
  args: z.infer<typeof axiomTestV3Schema>,
  claudeCode: ClaudeCodeSubprocessV3
) {
  console.error('[TEST-V3] Starting test with prompt:', args.prompt.substring(0, 50));
  
  try {
    const result = await claudeCode.execute(args.prompt, {
      taskType: 'implementation',
      enableMonitoring: true,
      enableIntervention: true
    });
    
    return {
      content: [{
        type: 'text',
        text: `✅ V3 Test Complete!
        
Task ID: ${result.id}
Duration: ${result.duration}ms
Status: Success

Output:
${result.response}

No timeout! Task ran for ${Math.round(result.duration / 1000)}s`
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `❌ V3 Test Failed: ${error.message}`
      }]
    };
  }
}