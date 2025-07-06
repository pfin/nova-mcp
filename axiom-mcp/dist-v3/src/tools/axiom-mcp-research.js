import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
export const axiomMcpResearchSchema = z.object({
    topic: z.string().describe('The research topic or question to explore'),
    depth: z.enum(['quick', 'standard', 'deep']).default('standard').describe('Research depth - quick (5 min), standard (15 min), deep (30+ min)'),
    constraints: z.array(z.string()).optional().describe('Any constraints or specific requirements'),
    outputFormat: z.enum(['summary', 'detailed', 'structured']).default('detailed').describe('Output format preference'),
    allowedTools: z.array(z.string()).optional().describe('Specific tools Claude Code should use (e.g., ["WebSearch", "Read"])'),
});
export const axiomMcpResearchTool = {
    name: 'axiom_mcp_research',
    description: 'Conduct in-depth research using Claude Code with Axiom MCP methodology - iterative goal refinement, systematic exploration, and synthesis',
    inputSchema: zodToJsonSchema(axiomMcpResearchSchema),
};
export async function handleAxiomMcpResearch(input, claudeCode) {
    try {
        // Step 1: Goal Clarification Phase
        const clarificationPrompt = `
You are Axiom MCP, an expert research assistant. Your task is to conduct thorough research on the following topic:

**Topic**: ${input.topic}

**Constraints**: ${input.constraints?.join(', ') || 'None specified'}

**Research Depth**: ${input.depth}

Please follow this systematic approach:

1. **Goal Clarification** (2-3 minutes):
   - Break down the research topic into clear, specific questions
   - Identify key concepts and terms to explore
   - Note any assumptions that need validation
   - Define success criteria for the research

2. **Information Gathering** (${getTimeAllocation(input.depth)} minutes):
   - Search for relevant information using available tools
   - Focus on authoritative and recent sources
   - Collect diverse perspectives on the topic
   - Note contradictions or debates in the field

3. **Analysis & Synthesis** (3-5 minutes):
   - Identify patterns and connections
   - Evaluate the reliability of sources
   - Synthesize findings into coherent insights
   - Note any gaps or areas needing further research

4. **Output Generation**:
   - Present findings in ${input.outputFormat} format
   - Include confidence levels for key claims
   - Provide actionable insights or recommendations
   - List sources and suggest next steps

Begin your research now. Use web search, read documentation, and any other available tools to gather comprehensive information.
`;
        const result = await claudeCode.execute(clarificationPrompt, {
            allowedTools: input.allowedTools,
            timeout: getTimeout(input.depth),
        });
        // Format the response based on output format preference
        let formattedResponse = result.response;
        if (input.outputFormat === 'structured') {
            // Post-process to ensure structured format
            formattedResponse = await structureResponse(result.response, claudeCode);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: formattedResponse,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Research failed: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
        };
    }
}
function getTimeAllocation(depth) {
    switch (depth) {
        case 'quick': return '3-5';
        case 'standard': return '10-15';
        case 'deep': return '25-30';
        default: return '10-15';
    }
}
function getTimeout(depth) {
    switch (depth) {
        case 'quick': return 300000; // 5 minutes
        case 'standard': return 900000; // 15 minutes
        case 'deep': return 1800000; // 30 minutes
        default: return 900000;
    }
}
async function structureResponse(response, claudeCode) {
    const structuringPrompt = `
Please restructure the following research findings into a well-organized format:

${response}

Structure it as:
# Executive Summary
[2-3 sentence overview]

# Key Findings
[Numbered list of main discoveries]

# Detailed Analysis
[Organized by theme or question]

# Confidence Assessment
[Reliability of findings]

# Recommendations
[Actionable next steps]

# Sources & References
[Key sources used]
`;
    const structured = await claudeCode.execute(structuringPrompt, {
        timeout: 60000, // 1 minute for restructuring
    });
    return structured.response;
}
//# sourceMappingURL=axiom-mcp-research.js.map