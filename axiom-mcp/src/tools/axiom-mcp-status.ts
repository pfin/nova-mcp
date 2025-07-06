import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { StatusManager } from '../status-manager.js';

export const axiomMcpStatusSchema = z.object({
  action: z.enum(['system', 'recent', 'task', 'tree', 'clear', 'most_recent']).describe('Status action to perform'),
  taskId: z.string().optional().describe('Task ID for specific queries'),
  limit: z.number().default(10).describe('Number of recent items to show'),
  daysToKeep: z.number().default(7).describe('Days to keep when clearing old tasks'),
  // Filters for most_recent action
  filters: z.object({
    status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
    taskType: z.string().optional(),
    hasErrors: z.boolean().optional(),
    minDepth: z.number().optional(),
    maxDepth: z.number().optional(),
    parentTask: z.string().optional(),
  }).optional().describe('Filters for most_recent action'),
});

export type axiomMcpStatusInput = z.infer<typeof axiomMcpStatusSchema>;

export const axiomMcpStatusTool = {
  name: 'axiom_mcp_status',
  description: 'Check system status, recent commands, task trees, and manage Axiom MCP state',
  inputSchema: zodToJsonSchema(axiomMcpStatusSchema),
};

export async function handleAxiomMcpStatus(
  input: axiomMcpStatusInput,
  statusManager: StatusManager
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    let output = '';

    switch (input.action) {
      case 'system': {
        const status = statusManager.getSystemStatus();
        output = `# Axiom MCP System Status\n\n`;
        output += `**Last Updated**: ${status.lastUpdated.toISOString()}\n\n`;
        output += `## Task Summary\n`;
        output += `- Total Tasks: ${status.totalTasks}\n`;
        output += `- Running: ${status.runningTasks}\n`;
        output += `- Completed: ${status.completedTasks}\n`;
        output += `- Failed: ${status.failedTasks}\n\n`;
        
        output += `## Active Sessions\n`;
        status.activeSessions.forEach((tasks, sessionId) => {
          output += `\n### Session: ${sessionId}\n`;
          tasks.forEach(task => {
            const statusEmoji = task.status === 'completed' ? '✅' : 
                               task.status === 'failed' ? '❌' : 
                               task.status === 'running' ? '🔄' : '⏳';
            output += `- ${statusEmoji} ${task.id}: ${task.prompt.substring(0, 50)}...\n`;
          });
        });
        break;
      }

      case 'recent': {
        const recent = statusManager.getRecentCommands(input.limit);
        output = `# Recent Axiom MCP Commands\n\n`;
        recent.forEach((task, index) => {
          output += `## ${index + 1}. ${task.id}\n`;
          output += `- **Status**: ${task.status}\n`;
          output += `- **Task Type**: ${task.taskType || 'General'} (${task.taskTypeId || 'none'})\n`;
          output += `- **Started**: ${task.startTime.toISOString()}\n`;
          if (task.temporalStartTime) {
            output += `- **Temporal Start**: ${task.temporalStartTime}\n`;
          }
          if (task.endTime) {
            output += `- **Duration**: ${Math.round((task.duration || 0) / 1000)}s\n`;
          }
          if (task.temporalEndTime) {
            output += `- **Temporal End**: ${task.temporalEndTime}\n`;
          }
          output += `- **Depth**: ${task.depth}\n`;
          output += `- **Prompt**: ${task.prompt.substring(0, 100)}...\n`;
          if (task.error) {
            output += `- **Error**: ${task.error}\n`;
          }
          if (task.childTasks && task.childTasks.length > 0) {
            output += `- **Child Tasks**: ${task.childTasks.length}\n`;
          }
          output += '\n';
        });
        break;
      }

      case 'most_recent': {
        const limit = input.limit === 10 ? 5 : input.limit; // Default to 5 for most_recent
        const recent = statusManager.getMostRecentTasks(limit, input.filters);
        output = `# Most Recent ${limit} Tasks`;
        if (input.filters) {
          output += ' (Filtered)';
        }
        output += '\n\n';
        
        if (recent.length === 0) {
          output += 'No tasks match the specified filters.\n';
        } else {
          recent.forEach((task, index) => {
            const statusEmoji = task.status === 'completed' ? '✅' : 
                               task.status === 'failed' ? '❌' : 
                               task.status === 'running' ? '🔄' : '⏳';
            
            output += `## ${index + 1}. ${statusEmoji} ${task.id}\n`;
            output += `- **Type**: ${task.taskType || 'General'}\n`;
            output += `- **Status**: ${task.status}\n`;
            output += `- **Depth**: ${task.depth}\n`;
            output += `- **Time**: ${task.temporalStartTime || task.startTime.toISOString()}\n`;
            output += `- **Prompt**: ${task.prompt.substring(0, 80)}...\n`;
            
            if (task.validationPassed !== undefined) {
              output += `- **Validation**: ${task.validationPassed ? '✅ Passed' : '❌ Failed'}\n`;
              if (!task.validationPassed && task.validationIssues) {
                output += `  - Issues: ${task.validationIssues.join(', ')}\n`;
              }
            }
            
            if (task.childTasks && task.childTasks.length > 0) {
              output += `- **Children**: ${task.childTasks.length} subtasks\n`;
            }
            
            output += '\n';
          });
        }
        break;
      }

      case 'task': {
        if (!input.taskId) {
          throw new Error('Task ID required for task action');
        }
        const task = statusManager.getTask(input.taskId);
        if (!task) {
          throw new Error(`Task ${input.taskId} not found`);
        }
        output = `# Task Details: ${task.id}\n\n`;
        output += `- **Status**: ${task.status}\n`;
        output += `- **Started**: ${task.startTime.toISOString()}\n`;
        if (task.endTime) {
          output += `- **Ended**: ${task.endTime.toISOString()}\n`;
          output += `- **Duration**: ${Math.round((task.duration || 0) / 1000)}s\n`;
        }
        output += `- **Depth**: ${task.depth}\n`;
        output += `- **Parent**: ${task.parentTask || 'None'}\n`;
        output += `\n## Prompt\n\`\`\`\n${task.prompt}\n\`\`\`\n`;
        if (task.output) {
          output += `\n## Output\n${task.output.substring(0, 1000)}${task.output.length > 1000 ? '...' : ''}\n`;
        }
        if (task.error) {
          output += `\n## Error\n${task.error}\n`;
        }
        if (task.childTasks && task.childTasks.length > 0) {
          output += `\n## Child Tasks\n`;
          task.childTasks.forEach(childId => {
            const child = statusManager.getTask(childId);
            if (child) {
              output += `- ${childId}: ${child.status} - ${child.prompt.substring(0, 50)}...\n`;
            }
          });
        }
        break;
      }

      case 'tree': {
        if (!input.taskId) {
          throw new Error('Task ID required for tree action');
        }
        const tree = statusManager.getTaskTree(input.taskId);
        if (!tree) {
          throw new Error(`Task ${input.taskId} not found`);
        }
        output = `# Task Tree: ${tree.id}\n\n`;
        output += formatTaskTree(tree, 0);
        break;
      }

      case 'clear': {
        statusManager.clearOldTasks(input.daysToKeep);
        output = `Cleared tasks older than ${input.daysToKeep} days`;
        break;
      }
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
          text: `Status check failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

function formatTaskTree(task: any, depth: number): string {
  const indent = '  '.repeat(depth);
  const statusEmoji = task.status === 'completed' ? '✅' : 
                     task.status === 'failed' ? '❌' : 
                     task.status === 'running' ? '🔄' : '⏳';
  
  let output = `${indent}${statusEmoji} ${task.id}\n`;
  output += `${indent}  Status: ${task.status}\n`;
  output += `${indent}  Prompt: ${task.prompt.substring(0, 50)}...\n`;
  if (task.duration) {
    output += `${indent}  Duration: ${Math.round(task.duration / 1000)}s\n`;
  }
  
  if (task.children && task.children.length > 0) {
    output += `${indent}  Children:\n`;
    task.children.forEach((child: any) => {
      output += formatTaskTree(child, depth + 2);
    });
  }
  
  return output;
}