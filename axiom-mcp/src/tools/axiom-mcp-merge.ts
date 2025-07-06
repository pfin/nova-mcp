import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { StatusManager } from '../status-manager.js';
import { ContextManager } from '../context-manager.js';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';

export const axiomMcpMergeSchema = z.object({
  taskIds: z.array(z.string()).min(2).describe('Task IDs to merge findings from'),
  mergeStrategy: z.enum(['synthesize', 'compare', 'deduplicate', 'hierarchical']).default('synthesize'),
  outputFormat: z.enum(['unified', 'comparison', 'matrix']).default('unified'),
  parentTaskId: z.string().optional().describe('Parent task for hierarchical merge'),
});

export type axiomMcpMergeInput = z.infer<typeof axiomMcpMergeSchema>;

export const axiomMcpMergeTool = {
  name: 'axiom_mcp_merge',
  description: 'Merge and synthesize findings from multiple research branches',
  inputSchema: zodToJsonSchema(axiomMcpMergeSchema),
};

export async function handleAxiomMcpMerge(
  input: axiomMcpMergeInput,
  statusManager: StatusManager,
  contextManager: ContextManager,
  claudeCode: ClaudeCodeSubprocess
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Gather all task outputs
    const taskData = input.taskIds.map(taskId => {
      const task = statusManager.getTask(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      const context = contextManager.getContext(taskId);
      return {
        task,
        context,
        output: task.output || '',
      };
    });

    let mergedContent = '';

    switch (input.mergeStrategy) {
      case 'synthesize':
        mergedContent = await synthesizeFindings(taskData, claudeCode);
        break;

      case 'compare':
        mergedContent = await compareFindings(taskData, claudeCode);
        break;

      case 'deduplicate':
        mergedContent = await deduplicateFindings(taskData, claudeCode);
        break;

      case 'hierarchical':
        mergedContent = await hierarchicalMerge(taskData, input.parentTaskId, statusManager, claudeCode);
        break;
    }

    // Format output based on requested format
    const formattedOutput = formatMergedOutput(mergedContent, input.outputFormat, taskData);

    return {
      content: [
        {
          type: 'text',
          text: formattedOutput,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Merge operation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

async function synthesizeFindings(
  taskData: any[],
  claudeCode: ClaudeCodeSubprocess
): Promise<string> {
  const synthesisPrompt = `
You are synthesizing research findings from multiple branches.

${taskData.map((data, index) => `
Branch ${index + 1}: ${data.task.prompt}
Output:
${data.output}
`).join('\n---\n')}

Please:
1. Identify common themes and patterns
2. Highlight unique insights from each branch
3. Resolve any contradictions with explanation
4. Create a unified understanding
5. Suggest areas needing further research

Provide a comprehensive synthesis.`;

  const result = await claudeCode.execute(synthesisPrompt, {
    timeout: 300000, // 5 minutes
  });

  return result.response;
}

async function compareFindings(
  taskData: any[],
  claudeCode: ClaudeCodeSubprocess
): Promise<string> {
  const comparePrompt = `
Compare and contrast the following research findings:

${taskData.map((data, index) => `
Branch ${index + 1}: ${data.task.prompt}
Findings:
${data.output}
`).join('\n---\n')}

Create a detailed comparison that includes:
1. Similarities across branches
2. Key differences and why they exist
3. Complementary insights
4. Conflicting information
5. Reliability assessment of each branch

Format as a structured comparison.`;

  const result = await claudeCode.execute(comparePrompt, {
    timeout: 300000,
  });

  return result.response;
}

async function deduplicateFindings(
  taskData: any[],
  claudeCode: ClaudeCodeSubprocess
): Promise<string> {
  const dedupePrompt = `
Remove duplicate information from these research findings:

${taskData.map((data, index) => `
Source ${index + 1}: ${data.task.prompt}
Content:
${data.output}
`).join('\n---\n')}

Please:
1. Identify and merge duplicate information
2. Preserve unique insights from each source
3. Note which sources provided which information
4. Maintain the most detailed version of duplicated content
5. Organize by topic or theme

Output deduplicated findings with source attribution.`;

  const result = await claudeCode.execute(dedupePrompt, {
    timeout: 300000,
  });

  return result.response;
}

async function hierarchicalMerge(
  taskData: any[],
  parentTaskId: string | undefined,
  statusManager: StatusManager,
  claudeCode: ClaudeCodeSubprocess
): Promise<string> {
  // Get parent context if provided
  let parentContext = '';
  if (parentTaskId) {
    const parentTask = statusManager.getTask(parentTaskId);
    if (parentTask) {
      parentContext = `Parent Goal: ${parentTask.prompt}\n`;
    }
  }

  // Build hierarchy information
  const hierarchyInfo = taskData.map(data => {
    const depth = data.task.depth || 0;
    return {
      ...data,
      depth,
      level: `Level ${depth}`,
    };
  });

  // Sort by depth
  hierarchyInfo.sort((a, b) => a.depth - b.depth);

  const hierarchicalPrompt = `
Perform a hierarchical merge of research findings.

${parentContext}

Research branches by level:
${hierarchyInfo.map((data, index) => `
${data.level} - ${data.task.prompt}
Findings:
${data.output}
`).join('\n---\n')}

Please:
1. Organize findings hierarchically from high-level to detailed
2. Show how deeper levels support higher-level conclusions
3. Identify gaps at each level
4. Create a coherent narrative from general to specific
5. Highlight cross-level insights

Structure the output to reflect the research hierarchy.`;

  const result = await claudeCode.execute(hierarchicalPrompt, {
    timeout: 300000,
  });

  return result.response;
}

function formatMergedOutput(
  content: string,
  format: 'unified' | 'comparison' | 'matrix',
  taskData: any[]
): string {
  let output = '';

  switch (format) {
    case 'unified':
      output = `# Unified Research Findings\n\n`;
      output += `**Merged from ${taskData.length} branches**\n\n`;
      output += content;
      break;

    case 'comparison':
      output = `# Comparative Analysis\n\n`;
      output += `## Sources\n`;
      taskData.forEach((data, index) => {
        output += `${index + 1}. ${data.task.prompt}\n`;
      });
      output += `\n## Comparison\n\n`;
      output += content;
      break;

    case 'matrix':
      output = `# Research Matrix\n\n`;
      output += `## Task Overview\n`;
      output += `| Task | Status | Duration | Key Finding |\n`;
      output += `|------|--------|----------|-------------|\n`;
      taskData.forEach(data => {
        const keyFinding = data.output.substring(0, 50).replace(/\n/g, ' ');
        const duration = data.task.duration ? `${(data.task.duration / 1000).toFixed(1)}s` : 'N/A';
        output += `| ${data.task.prompt.substring(0, 30)}... | ${data.task.status} | ${duration} | ${keyFinding}... |\n`;
      });
      output += `\n## Merged Findings\n\n`;
      output += content;
      break;
  }

  // Add metadata
  output += `\n\n---\n`;
  output += `*Merge completed at ${new Date().toISOString()}*\n`;
  output += `*Strategy: ${taskData[0].task.depth !== undefined ? 'hierarchical' : 'parallel'}*\n`;

  return output;
}