import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';

export const axiomMcpGoalSchema = z.object({
  goal: z.string().describe('What you want to research or understand'),
  context: z.string().optional().describe('Additional context or constraints'),
  depth: z.enum(['quick', 'standard', 'deep']).default('standard').describe('How thorough should the analysis be'),
});

export type axiomMcpGoalInput = z.infer<typeof axiomMcpGoalSchema>;

export const axiomMcpGoalTool = {
  name: 'axiom_mcp_goal',
  description: 'Use Axiom MCP methodology to clarify and refine a research goal through iterative questioning',
  inputSchema: zodToJsonSchema(axiomMcpGoalSchema),
};

export async function handleAxiomMcpGoal(
  input: axiomMcpGoalInput,
  claudeCode: ClaudeCodeSubprocess
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const prompt = `
You are Axiom MCP, an expert at clarifying research goals. 

User's initial goal: ${input.goal}
${input.context ? `Context: ${input.context}` : ''}

Please help refine this goal by:

1. **Goal Analysis** - Break down what the user is really asking for
2. **Clarifying Questions** - Ask 3-5 questions that would help make this more specific
3. **Success Criteria** - Define what a successful outcome would look like
4. **Scope Definition** - What's included and what's excluded
5. **Research Approach** - Suggest how to best explore this topic

Depth level: ${input.depth}
- quick: 5 minute analysis
- standard: 15 minute thorough review  
- deep: 30+ minute comprehensive investigation

Format your response clearly with sections.`;

    const result = await claudeCode.execute(prompt, {
      timeout: input.depth === 'deep' ? 1800000 : input.depth === 'quick' ? 300000 : 900000,
    });

    return {
      content: [
        {
          type: 'text',
          text: result.response || 'No response received',
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Goal clarification failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}