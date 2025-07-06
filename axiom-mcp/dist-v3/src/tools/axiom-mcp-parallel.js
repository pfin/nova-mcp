import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
export const axiomMcpParallelSchema = z.object({
    mainGoal: z.string().describe('The main research goal or question'),
    branches: z.array(z.object({
        id: z.string().describe('Branch identifier'),
        focus: z.string().describe('Specific aspect to explore in this branch'),
        tools: z.array(z.string()).optional().describe('Allowed tools for this branch'),
    })).min(2).max(5).describe('Parallel research branches (2-5)'),
    synthesize: z.boolean().default(true).describe('Whether to synthesize findings across branches'),
    timeLimit: z.number().default(600000).describe('Time limit per branch in milliseconds'),
});
export const axiomMcpParallelTool = {
    name: 'axiom_mcp_parallel',
    description: 'Execute multiple research branches in parallel using Claude Code subprocesses, then synthesize findings',
    inputSchema: zodToJsonSchema(axiomMcpParallelSchema),
};
export async function handleAxiomMcpParallel(input, claudeCode) {
    try {
        // Create prompts for each branch
        const branchPrompts = input.branches.map(branch => ({
            id: branch.id,
            prompt: `
You are conducting focused research as part of a larger investigation.

**Main Goal**: ${input.mainGoal}
**Your Focus**: ${branch.focus}

Please:
1. Research specifically your assigned focus area
2. Gather relevant information, data, and insights
3. Note connections to the broader goal
4. Identify any dependencies or relationships with other aspects
5. Present findings clearly with sources

Time limit: ${Math.floor(input.timeLimit / 60000)} minutes
`,
            tools: branch.tools,
        }));
        // Execute branches in parallel
        const branchPromises = branchPrompts.map(branch => claudeCode.execute(branch.prompt, {
            allowedTools: branch.tools,
            timeout: input.timeLimit,
        }).then(result => ({
            id: branch.id,
            result,
        })));
        const branchResults = await Promise.all(branchPromises);
        // Format individual results
        let combinedFindings = '# Parallel Research Results\n\n';
        for (const branch of branchResults) {
            combinedFindings += `## Branch: ${branch.id}\n\n`;
            combinedFindings += branch.result.response + '\n\n';
            combinedFindings += '---\n\n';
        }
        // Synthesize if requested
        if (input.synthesize) {
            const synthesisPrompt = `
You are Axiom MCP, synthesizing findings from parallel research branches.

**Main Research Goal**: ${input.mainGoal}

**Branch Findings**:
${combinedFindings}

Please:
1. Identify common themes and patterns across branches
2. Note contradictions or conflicting information
3. Synthesize key insights that address the main goal
4. Highlight unexpected discoveries or connections
5. Provide integrated recommendations
6. List any gaps that remain

Create a cohesive synthesis that brings together all findings into actionable insights.
`;
            const synthesis = await claudeCode.execute(synthesisPrompt, {
                timeout: 300000, // 5 minutes for synthesis
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `# Axiom MCP Parallel Research: ${input.mainGoal}\n\n${synthesis.response}\n\n## Detailed Branch Findings\n\n${combinedFindings}`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: combinedFindings,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Parallel research failed: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
        };
    }
}
//# sourceMappingURL=axiom-mcp-parallel.js.map