import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
export const axiomMcpSynthesisSchema = z.object({
    contextId: z.string().describe('Context ID to synthesize'),
    includeChildren: z.boolean().default(true).describe('Include child context findings'),
    depth: z.enum(['summary', 'detailed', 'comprehensive']).default('detailed'),
});
export const axiomMcpSynthesisTool = {
    name: 'axiom_mcp_synthesis',
    description: 'Synthesize findings from a context tree into coherent insights',
    inputSchema: zodToJsonSchema(axiomMcpSynthesisSchema),
};
// Shared context manager instance
let contextManager;
export function initializeSynthesisContextManager(cm) {
    contextManager = cm;
}
export async function handleAxiomMcpSynthesis(input, claudeCode) {
    try {
        // Get the context
        const rootContext = contextManager.getContext(input.contextId);
        if (!rootContext) {
            throw new Error(`Context ${input.contextId} not found`);
        }
        // Collect all relevant contexts
        const contexts = input.includeChildren
            ? collectAllContexts(rootContext.id)
            : [rootContext];
        // Check if all contexts are complete
        const incompleteContexts = contexts.filter(ctx => ctx.status !== 'complete');
        if (incompleteContexts.length > 0) {
            return formatIncompleteWarning(incompleteContexts, rootContext);
        }
        // Prepare findings for synthesis
        const findingsData = prepareFindingsData(contexts);
        // Execute synthesis based on depth
        const synthesis = await executeSynthesis(rootContext.goal, findingsData, input.depth, claudeCode);
        // Format final response
        return formatSynthesisResponse(rootContext, synthesis, contexts);
    }
    catch (error) {
        return {
            content: [{
                    type: 'text',
                    text: `Synthesis failed: ${error instanceof Error ? error.message : String(error)}`,
                }],
        };
    }
}
function collectAllContexts(rootId) {
    const contexts = [];
    const queue = [rootId];
    while (queue.length > 0) {
        const id = queue.shift();
        const context = contextManager.getContext(id);
        if (context) {
            contexts.push(context);
            const children = contextManager.getChildContexts(id);
            queue.push(...children.map(c => c.id));
        }
    }
    return contexts;
}
function prepareFindingsData(contexts) {
    // Group findings by depth and goal
    const byDepth = {};
    contexts.forEach(ctx => {
        if (!byDepth[ctx.depth]) {
            byDepth[ctx.depth] = [];
        }
        byDepth[ctx.depth].push({
            goal: ctx.goal,
            findings: ctx.findings,
            subGoals: ctx.subGoals,
        });
    });
    return {
        totalContexts: contexts.length,
        maxDepth: Math.max(...contexts.map(c => c.depth)),
        byDepth,
        allFindings: contexts.flatMap(c => c.findings),
    };
}
async function executeSynthesis(mainGoal, findingsData, depth, claudeCode) {
    const depthInstructions = {
        summary: 'Provide a concise executive summary (3-5 paragraphs)',
        detailed: 'Provide detailed analysis with key themes and recommendations',
        comprehensive: 'Provide exhaustive analysis with all insights, patterns, and implications',
    };
    const prompt = `
You are Axiom MCP, synthesizing research findings.

**Main Research Goal**: ${mainGoal}

**Research Statistics**:
- Total contexts explored: ${findingsData.totalContexts}
- Maximum depth reached: ${findingsData.maxDepth}
- Total findings: ${findingsData.allFindings.length}

**Hierarchical Findings**:
${formatHierarchicalFindings(findingsData.byDepth)}

**Your Task**:
${depthInstructions[depth]}

Please synthesize these findings into a coherent response that:
1. Identifies key patterns and themes across all research branches
2. Highlights the most important discoveries
3. Notes any contradictions or areas of uncertainty
4. Provides actionable recommendations
5. Suggests areas for further investigation if needed

Focus on creating value from the collective insights rather than just summarizing each branch.`;
    const result = await claudeCode.execute(prompt, {
        timeout: depth === 'comprehensive' ? 600000 : 300000
    });
    return result.response;
}
function formatHierarchicalFindings(byDepth) {
    let formatted = '';
    Object.keys(byDepth)
        .sort((a, b) => Number(a) - Number(b))
        .forEach(depth => {
        formatted += `\n### Depth ${depth} Findings\n`;
        byDepth[Number(depth)].forEach(item => {
            formatted += `\n**Goal**: ${item.goal}\n`;
            formatted += `**Findings**:\n`;
            item.findings.forEach((f, i) => {
                // Truncate long findings for the prompt
                const truncated = f.length > 1000 ? f.substring(0, 1000) + '...' : f;
                formatted += `${i + 1}. ${truncated}\n`;
            });
        });
    });
    return formatted;
}
function formatIncompleteWarning(incompleteContexts, rootContext) {
    const pending = incompleteContexts.filter(c => c.status === 'pending');
    const exploring = incompleteContexts.filter(c => c.status === 'exploring');
    let warning = `# Synthesis Warning: Incomplete Research\n\n`;
    warning += `Cannot synthesize "${rootContext.goal}" - some contexts are incomplete:\n\n`;
    if (exploring.length > 0) {
        warning += `## Currently Exploring (${exploring.length})\n`;
        exploring.forEach(ctx => {
            warning += `- ${ctx.goal} (Context: ${ctx.id})\n`;
        });
    }
    if (pending.length > 0) {
        warning += `\n## Pending Execution (${pending.length})\n`;
        pending.forEach(ctx => {
            warning += `- ${ctx.goal} (Context: ${ctx.id})\n`;
        });
        warning += `\n## Execute these calls to continue:\n\n`;
        pending.forEach(ctx => {
            warning += `\`\`\`json\n`;
            warning += JSON.stringify({
                tool: 'axiom_mcp_chain',
                arguments: {
                    goal: ctx.goal,
                    parentContext: ctx.parentId || rootContext.id,
                },
            }, null, 2);
            warning += `\n\`\`\`\n\n`;
        });
    }
    return {
        content: [{ type: 'text', text: warning }],
    };
}
function formatSynthesisResponse(rootContext, synthesis, contexts) {
    let response = `# Axiom MCP Synthesis: ${rootContext.goal}\n\n`;
    response += `*Root Context: ${rootContext.id}*\n`;
    response += `*Total Contexts Synthesized: ${contexts.length}*\n\n`;
    response += `## Synthesis\n\n${synthesis}\n\n`;
    // Add context tree visualization
    response += `## Research Tree\n\`\`\`\n`;
    response += JSON.stringify(contextManager.getContextTree(rootContext.id), null, 2);
    response += `\n\`\`\`\n\n`;
    // Add execution statistics
    const totalDuration = contexts.reduce((sum, ctx) => {
        if (ctx.completedAt && ctx.createdAt) {
            return sum + (new Date(ctx.completedAt).getTime() - new Date(ctx.createdAt).getTime());
        }
        return sum;
    }, 0);
    response += `## Statistics\n`;
    response += `- Total execution time: ${Math.round(totalDuration / 1000)}s\n`;
    response += `- Average time per context: ${Math.round(totalDuration / contexts.length / 1000)}s\n`;
    response += `- Maximum depth reached: ${Math.max(...contexts.map(c => c.depth))}\n`;
    return {
        content: [{ type: 'text', text: response }],
    };
}
//# sourceMappingURL=axiom-mcp-synthesis.js.map