import { z } from 'zod';
// Simple test tool for v3
export const axiomTestV3Tool = {
    name: 'axiom_test_v3',
    description: 'Test Axiom v3 with PTY executor (no timeout!)',
    inputSchema: z.object({
        prompt: z.string().describe('The prompt to execute'),
        useStreaming: z.boolean().optional().describe('Use streaming output')
    })
};
export async function handleAxiomTestV3(args, claudeCode) {
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
    }
    catch (error) {
        return {
            content: [{
                    type: 'text',
                    text: `❌ V3 Test Failed: ${error.message}`
                }]
        };
    }
}
//# sourceMappingURL=axiom-test-v3.js.map