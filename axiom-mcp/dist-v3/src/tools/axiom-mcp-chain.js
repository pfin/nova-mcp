import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
export const axiomMcpChainSchema = z.object({
    goal: z.string().describe('The research goal to explore'),
    maxDepth: z.number().default(3).describe('Maximum recursion depth'),
    strategy: z.enum(['breadth-first', 'depth-first']).default('breadth-first'),
    parentContext: z.string().optional().describe('Parent context ID for continuing research'),
    autoDecompose: z.boolean().default(true).describe('Automatically decompose complex goals'),
});
export const axiomMcpChainTool = {
    name: 'axiom_mcp_chain',
    description: 'Execute recursive chain-of-goal research with automatic decomposition and context tracking',
    inputSchema: zodToJsonSchema(axiomMcpChainSchema),
};
// Shared context manager instance
let contextManager;
export function initializeContextManager(cm) {
    contextManager = cm;
}
export async function handleAxiomMcpChain(input, claudeCode) {
    try {
        // Create or retrieve context
        const context = input.parentContext
            ? contextManager.getContext(input.parentContext)
            : contextManager.createContext(input.goal);
        if (!context) {
            throw new Error(`Parent context ${input.parentContext} not found`);
        }
        // Check depth limit
        if (context.depth >= input.maxDepth) {
            return {
                content: [{
                        type: 'text',
                        text: `Maximum depth (${input.maxDepth}) reached. Please execute this goal directly or increase maxDepth.`,
                    }],
            };
        }
        // Update context status
        contextManager.updateContext(context.id, { status: 'exploring' });
        // Step 1: Analyze goal complexity
        const complexityAnalysis = await analyzeGoalComplexity(input.goal, claudeCode);
        if (!complexityAnalysis.isComplex || !input.autoDecompose) {
            // Simple goal - execute directly
            const result = await executeDirectGoal(input.goal, context, claudeCode);
            return formatDirectResult(result, context);
        }
        // Step 2: Decompose complex goal
        const decomposition = await decomposeGoal(input.goal, claudeCode);
        contextManager.updateContext(context.id, {
            subGoals: decomposition.subGoals,
        });
        // Step 3: Create child contexts for sub-goals
        const childContexts = decomposition.subGoals.map(subGoal => contextManager.createContext(subGoal, context.id));
        // Step 4: Determine which can be executed now vs need recursion
        const executionPlan = await planExecution(decomposition, childContexts, input.strategy, claudeCode);
        // Step 5: Execute immediate tasks
        const immediateResults = await executeImmediateTasks(executionPlan.immediate, claudeCode);
        // Step 6: Generate response with results and instructions
        return formatChainResponse(context, immediateResults, executionPlan.recursive, contextManager);
    }
    catch (error) {
        return {
            content: [{
                    type: 'text',
                    text: `Chain execution failed: ${error instanceof Error ? error.message : String(error)}`,
                }],
        };
    }
}
async function analyzeGoalComplexity(goal, claudeCode) {
    const prompt = `
Analyze if this goal requires decomposition:
"${goal}"

Answer in JSON:
{
  "isComplex": true/false,
  "reason": "explanation",
  "estimatedSubGoals": number
}

Consider it complex if:
- Multiple distinct aspects to research
- Requires different types of analysis
- Would benefit from parallel exploration
- Too broad for single-pass research`;
    const result = await claudeCode.execute(prompt, { timeout: 30000 });
    try {
        return JSON.parse(result.response);
    }
    catch {
        // Default to simple if parsing fails
        return { isComplex: false, reason: 'Could not analyze complexity' };
    }
}
async function decomposeGoal(goal, claudeCode) {
    const prompt = `
You are Axiom MCP. Decompose this research goal into sub-goals:
"${goal}"

Rules:
1. Each sub-goal should be specific and actionable
2. Limit to 2-5 sub-goals
3. Sub-goals can be executed independently
4. Together they should fully address the main goal

Return JSON:
{
  "subGoals": ["goal1", "goal2", ...],
  "strategy": "sequential|parallel",
  "rationale": "explanation"
}`;
    const result = await claudeCode.execute(prompt, { timeout: 60000 });
    try {
        const parsed = JSON.parse(result.response);
        return {
            subGoals: parsed.subGoals.slice(0, 5), // Limit to 5
            strategy: parsed.strategy || 'parallel',
        };
    }
    catch {
        throw new Error('Failed to decompose goal');
    }
}
async function planExecution(decomposition, childContexts, strategy, claudeCode) {
    // For each sub-goal, determine if it needs further decomposition
    const classifications = await Promise.all(decomposition.subGoals.map(async (subGoal, index) => {
        const analysis = await analyzeGoalComplexity(subGoal, claudeCode);
        return {
            subGoal,
            context: childContexts[index],
            isComplex: analysis.isComplex,
            reason: analysis.reason,
        };
    }));
    const immediate = classifications
        .filter(c => !c.isComplex)
        .map(c => ({ goal: c.subGoal, context: c.context }));
    const recursive = classifications
        .filter(c => c.isComplex)
        .map(c => ({
        goal: c.subGoal,
        context: c.context,
        reason: c.reason,
    }));
    return { immediate, recursive };
}
async function executeDirectGoal(goal, context, claudeCode) {
    const prompt = `
Research the following goal thoroughly:
"${goal}"

Provide:
1. Key findings and insights
2. Important considerations
3. Recommendations
4. Sources or references used

Be comprehensive but concise.`;
    const result = await claudeCode.execute(prompt, { timeout: 300000 }); // 5 minutes
    // Update context with findings
    contextManager.updateContext(context.id, {
        findings: [result.response],
        status: 'complete',
    });
    return result;
}
async function executeImmediateTasks(tasks, claudeCode) {
    // Execute in parallel for efficiency
    return Promise.all(tasks.map(task => executeDirectGoal(task.goal, task.context, claudeCode)));
}
function formatDirectResult(result, context) {
    return {
        content: [{
                type: 'text',
                text: `# Research Result: ${context.goal}\n\n${result.response}\n\n---\n*Context ID: ${context.id}*`,
            }],
    };
}
function formatChainResponse(context, immediateResults, recursiveTasks, contextManager) {
    let response = `# Chain-of-Goal Research: ${context.goal}\n\n`;
    response += `*Context ID: ${context.id}*\n\n`;
    // Show context tree
    response += `## Research Structure\n\`\`\`\n`;
    response += JSON.stringify(contextManager.getContextTree(context.id), null, 2);
    response += `\n\`\`\`\n\n`;
    // Immediate results
    if (immediateResults.length > 0) {
        response += `## Completed Sub-Goals (${immediateResults.length})\n\n`;
        immediateResults.forEach((result, i) => {
            response += `### ${i + 1}. ${context.subGoals[i]}\n`;
            response += result.response.substring(0, 500) + '...\n\n';
        });
    }
    // Recursive instructions
    if (recursiveTasks.length > 0) {
        response += `## Requires Further Decomposition (${recursiveTasks.length})\n\n`;
        response += `The following sub-goals are complex and need recursive exploration:\n\n`;
        recursiveTasks.forEach((task, i) => {
            response += `### ${task.goal}\n`;
            response += `- **Reason**: ${task.reason}\n`;
            response += `- **Context ID**: ${task.context.id}\n`;
            response += `- **Call**: \`\`\`json\n`;
            response += JSON.stringify({
                tool: 'axiom_mcp_chain',
                arguments: {
                    goal: task.goal,
                    parentContext: task.context.id,
                    maxDepth: 3,
                    autoDecompose: true,
                },
            }, null, 2);
            response += `\n\`\`\`\n\n`;
        });
    }
    // Synthesis instructions
    if (immediateResults.length > 0 || recursiveTasks.length > 0) {
        response += `## Next Steps\n\n`;
        if (recursiveTasks.length > 0) {
            response += `1. Execute the recursive calls above for complex sub-goals\n`;
            response += `2. Once all sub-goals are complete, call synthesis:\n\n`;
        }
        else {
            response += `All sub-goals completed! To synthesize findings:\n\n`;
        }
        response += `\`\`\`json\n`;
        response += JSON.stringify({
            tool: 'axiom_mcp_synthesis',
            arguments: {
                contextId: context.id,
                includeChildren: true,
            },
        }, null, 2);
        response += `\n\`\`\`\n`;
    }
    return {
        content: [{ type: 'text', text: response }],
    };
}
//# sourceMappingURL=axiom-mcp-chain.js.map