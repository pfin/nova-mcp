import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
import { StatusManager, TaskStatus } from '../status-manager.js';
import { v4 as uuidv4 } from 'uuid';

let statusManager: StatusManager | null = null;

export function initializeExploreStatusManager(manager: StatusManager) {
  statusManager = manager;
}

export const axiomMcpExploreSchema = z.object({
  topics: z.array(z.string()).min(1).max(5).describe('Topics to explore (1-5 parallel branches)'),
  mainGoal: z.string().describe('The overarching research question'),
  tools: z.array(z.string()).optional().describe('Specific tools to use (e.g., ["WebSearch", "Read"])'),
  synthesize: z.boolean().default(true).describe('Combine findings into unified insights'),
});

export type axiomMcpExploreInput = z.infer<typeof axiomMcpExploreSchema>;

export const axiomMcpExploreTool = {
  name: 'axiom_mcp_explore',
  description: 'Execute parallel research branches using Claude Code subprocesses',
  inputSchema: zodToJsonSchema(axiomMcpExploreSchema),
};

export async function handleAxiomMcpExplore(
  input: axiomMcpExploreInput,
  claudeCode: ClaudeCodeSubprocess
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Create prompts for parallel execution
    const branchPrompts = input.topics.map((topic, index) => ({
      id: `branch_${index + 1}`,
      prompt: `Research: ${topic}`,
      options: {
        allowedTools: input.tools || ['WebSearch', 'Read', 'Grep', 'Task'],
        timeout: 300000, // 5 minutes per branch
      },
    }));

    // Execute branches in parallel
    console.error(`Executing ${branchPrompts.length} research branches in parallel...`);
    const results = await claudeCode.executeParallel(branchPrompts);

    // Format results
    let output = `# Axiom MCP Parallel Research Results\n\n`;
    output += `**Main Goal**: ${input.mainGoal}\n\n`;
    
    // Add individual branch results
    results.forEach((result, index) => {
      output += `## Branch ${index + 1}: ${input.topics[index]}\n\n`;
      if (result.error) {
        output += `⚠️ Error: ${result.error}\n\n`;
      }
      output += result.response + '\n\n';
      output += `*Duration: ${Math.round(result.duration / 1000)}s*\n\n`;
      output += '---\n\n';
    });

    // Synthesize if requested
    if (input.synthesize && results.filter(r => !r.error).length > 0) {
      const synthesisPrompt = `
You are Axiom MCP, synthesizing research findings.

Main Goal: ${input.mainGoal}

Branch Findings:
${results.map((r, i) => `
Branch ${i + 1} (${input.topics[i]}):
${r.response}
`).join('\n---\n')}

Please:
1. Identify key patterns and connections
2. Highlight the most important discoveries
3. Note any contradictions or gaps
4. Provide actionable insights
5. Suggest next steps

Create a cohesive synthesis that addresses the main goal.`;

      const synthesis = await claudeCode.execute(synthesisPrompt, {
        timeout: 300000, // 5 minutes for synthesis
      });

      output = `# Axiom MCP Research Synthesis\n\n${synthesis.response}\n\n---\n\n${output}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Exploration failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}