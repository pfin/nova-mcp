import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { StatusManager } from '../status-manager.js';
import { ContextManager } from '../context-manager.js';

export const axiomMcpTreeSchema = z.object({
  action: z.enum(['visualize', 'analyze', 'export', 'navigate']).describe('Tree operation to perform'),
  taskId: z.string().optional().describe('Root task ID (uses most recent if not provided)'),
  format: z.enum(['text', 'mermaid', 'json', 'markdown']).default('text').describe('Output format'),
  depth: z.number().optional().describe('Max depth to display'),
  includeContent: z.boolean().default(false).describe('Include task outputs in visualization'),
});

export type axiomMcpTreeInput = z.infer<typeof axiomMcpTreeSchema>;

export const axiomMcpTreeTool = {
  name: 'axiom_mcp_tree',
  description: 'Visualize, analyze, and navigate research trees with multiple levels',
  inputSchema: zodToJsonSchema(axiomMcpTreeSchema),
};

export async function handleAxiomMcpTree(
  input: axiomMcpTreeInput,
  statusManager: StatusManager,
  contextManager: ContextManager
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Get root task
    let rootTaskId = input.taskId;
    if (!rootTaskId) {
      // Find most recent root task
      const allTasks = statusManager.getAllTasks();
      const rootTasks = allTasks.filter(t => !t.parentTask);
      if (rootTasks.length === 0) {
        throw new Error('No root tasks found');
      }
      rootTaskId = rootTasks[rootTasks.length - 1].id;
    }

    const tree = statusManager.getTaskTree(rootTaskId);
    if (!tree) {
      throw new Error(`Task ${rootTaskId} not found`);
    }

    let output = '';

    switch (input.action) {
      case 'visualize':
        output = visualizeTree(tree, input.format, input.depth, input.includeContent);
        break;

      case 'analyze':
        output = analyzeTree(tree, statusManager);
        break;

      case 'export':
        output = exportTree(tree, input.format, statusManager, contextManager);
        break;

      case 'navigate':
        output = navigateTree(tree, input.depth || 5);
        break;

      default:
        throw new Error(`Unknown action: ${input.action}`);
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
          text: `Tree operation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

function visualizeTree(tree: any, format: string, maxDepth?: number, includeContent?: boolean): string {
  switch (format) {
    case 'text':
      return visualizeTextTree(tree, 0, maxDepth, includeContent);

    case 'mermaid':
      return visualizeMermaidTree(tree, maxDepth);

    case 'json':
      return JSON.stringify(tree, null, 2);

    case 'markdown':
      return visualizeMarkdownTree(tree, 0, maxDepth, includeContent);

    default:
      return visualizeTextTree(tree, 0, maxDepth, includeContent);
  }
}

function visualizeTextTree(tree: any, depth: number, maxDepth?: number, includeContent?: boolean): string {
  if (maxDepth && depth >= maxDepth) return '';

  const indent = '│ '.repeat(depth);
  const statusIcon = getStatusIcon(tree.status);
  let output = `${indent}${depth === 0 ? '┌' : '├'}─ ${statusIcon} ${tree.prompt.substring(0, 80)}...\n`;
  
  if (includeContent && tree.output) {
    const contentIndent = '│ '.repeat(depth + 1);
    output += `${contentIndent}📄 ${tree.output.substring(0, 100).replace(/\n/g, ' ')}...\n`;
  }

  if (tree.duration) {
    const timeIndent = '│ '.repeat(depth + 1);
    output += `${timeIndent}⏱️  ${(tree.duration / 1000).toFixed(1)}s\n`;
  }

  if (tree.children && tree.children.length > 0) {
    tree.children.forEach((child: any, index: number) => {
      output += visualizeTextTree(child, depth + 1, maxDepth, includeContent);
    });
  }

  return output;
}

function visualizeMermaidTree(tree: any, maxDepth?: number): string {
  let output = '```mermaid\ngraph TD\n';
  let nodeId = 0;

  function addNode(node: any, parentId: number | null, depth: number): number {
    if (maxDepth && depth >= maxDepth) return -1;

    const currentId = nodeId++;
    const label = node.prompt.substring(0, 50).replace(/"/g, '');
    const status = node.status;
    const className = status === 'completed' ? 'completed' : 
                     status === 'failed' ? 'failed' : 
                     status === 'running' ? 'running' : 'pending';

    output += `  ${currentId}["${label}..."]\n`;
    output += `  class ${currentId} ${className}\n`;

    if (parentId !== null) {
      output += `  ${parentId} --> ${currentId}\n`;
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => {
        addNode(child, currentId, depth + 1);
      });
    }

    return currentId;
  }

  addNode(tree, null, 0);

  output += '\n';
  output += 'classDef completed fill:#90EE90,stroke:#333,stroke-width:2px;\n';
  output += 'classDef failed fill:#FFB6C1,stroke:#333,stroke-width:2px;\n';
  output += 'classDef running fill:#87CEEB,stroke:#333,stroke-width:2px;\n';
  output += 'classDef pending fill:#F0E68C,stroke:#333,stroke-width:2px;\n';
  output += '```';

  return output;
}

function visualizeMarkdownTree(tree: any, depth: number, maxDepth?: number, includeContent?: boolean): string {
  if (maxDepth && depth >= maxDepth) return '';

  const indent = '  '.repeat(depth);
  const statusIcon = getStatusIcon(tree.status);
  let output = `${indent}- ${statusIcon} **${tree.prompt.substring(0, 60)}**\n`;
  
  if (tree.duration) {
    output += `${indent}  - Duration: ${(tree.duration / 1000).toFixed(1)}s\n`;
  }

  if (includeContent && tree.output) {
    output += `${indent}  - Output: ${tree.output.substring(0, 100).replace(/\n/g, ' ')}...\n`;
  }

  if (tree.children && tree.children.length > 0) {
    tree.children.forEach((child: any) => {
      output += visualizeMarkdownTree(child, depth + 1, maxDepth, includeContent);
    });
  }

  return output;
}

function analyzeTree(tree: any, statusManager: StatusManager): string {
  const stats = calculateTreeStats(tree);
  
  let output = `# Research Tree Analysis\n\n`;
  output += `## Overview\n`;
  output += `- **Root Task**: ${tree.prompt.substring(0, 100)}...\n`;
  output += `- **Total Nodes**: ${stats.totalNodes}\n`;
  output += `- **Max Depth**: ${stats.maxDepth}\n`;
  output += `- **Total Duration**: ${(stats.totalDuration / 1000).toFixed(1)}s\n`;
  output += `- **Average Duration**: ${(stats.avgDuration / 1000).toFixed(1)}s\n\n`;

  output += `## Status Breakdown\n`;
  output += `- ✅ Completed: ${stats.completed}\n`;
  output += `- ❌ Failed: ${stats.failed}\n`;
  output += `- 🔄 Running: ${stats.running}\n`;
  output += `- ⏳ Pending: ${stats.pending}\n\n`;

  output += `## Level Analysis\n`;
  stats.levelCounts.forEach((count: number, level: number) => {
    output += `- Level ${level}: ${count} tasks\n`;
  });

  output += `\n## Longest Paths\n`;
  const paths = findLongestPaths(tree);
  paths.slice(0, 3).forEach((path, index) => {
    output += `\n### Path ${index + 1} (${path.length} nodes)\n`;
    path.forEach((node, i) => {
      output += `${i + 1}. ${node.substring(0, 50)}...\n`;
    });
  });

  output += `\n## Branch Analysis\n`;
  const branches = analyzeBranches(tree);
  branches.forEach((branch, index) => {
    output += `- Branch ${index + 1}: ${branch.nodeCount} nodes, ${branch.maxDepth} deep\n`;
  });

  return output;
}

function calculateTreeStats(tree: any, depth: number = 0): any {
  const stats = {
    totalNodes: 1,
    maxDepth: depth,
    totalDuration: tree.duration || 0,
    completed: tree.status === 'completed' ? 1 : 0,
    failed: tree.status === 'failed' ? 1 : 0,
    running: tree.status === 'running' ? 1 : 0,
    pending: tree.status === 'pending' ? 1 : 0,
    levelCounts: new Map<number, number>(),
    avgDuration: 0,
  };

  stats.levelCounts.set(depth, 1);

  if (tree.children && tree.children.length > 0) {
    tree.children.forEach((child: any) => {
      const childStats = calculateTreeStats(child, depth + 1);
      stats.totalNodes += childStats.totalNodes;
      stats.maxDepth = Math.max(stats.maxDepth, childStats.maxDepth);
      stats.totalDuration += childStats.totalDuration;
      stats.completed += childStats.completed;
      stats.failed += childStats.failed;
      stats.running += childStats.running;
      stats.pending += childStats.pending;

      childStats.levelCounts.forEach((count: number, level: number) => {
        stats.levelCounts.set(level, (stats.levelCounts.get(level) || 0) + count);
      });
    });
  }

  stats.avgDuration = stats.totalDuration / stats.totalNodes;
  return stats;
}

function findLongestPaths(tree: any, currentPath: string[] = []): string[][] {
  const newPath = [...currentPath, tree.prompt];
  
  if (!tree.children || tree.children.length === 0) {
    return [newPath];
  }

  let allPaths: string[][] = [];
  tree.children.forEach((child: any) => {
    const childPaths = findLongestPaths(child, newPath);
    allPaths = allPaths.concat(childPaths);
  });

  return allPaths.sort((a, b) => b.length - a.length);
}

function analyzeBranches(tree: any): any[] {
  if (!tree.children || tree.children.length === 0) {
    return [];
  }

  return tree.children.map((child: any) => {
    const stats = calculateTreeStats(child);
    return {
      nodeCount: stats.totalNodes,
      maxDepth: stats.maxDepth,
      prompt: child.prompt,
    };
  });
}

function exportTree(tree: any, format: string, statusManager: StatusManager, contextManager: ContextManager): string {
  switch (format) {
    case 'json': {
      const exportData = {
        tree,
        metadata: {
          exportDate: new Date().toISOString(),
          totalNodes: calculateTreeStats(tree).totalNodes,
          maxDepth: calculateTreeStats(tree).maxDepth,
        },
        contexts: gatherContexts(tree, contextManager),
      };
      return JSON.stringify(exportData, null, 2);
    }

    case 'markdown': {
      let output = `# Research Tree Export\n\n`;
      output += `**Export Date**: ${new Date().toISOString()}\n\n`;
      output += `## Tree Structure\n\n`;
      output += visualizeMarkdownTree(tree, 0, undefined, true);
      output += `\n## Analysis\n\n`;
      output += analyzeTree(tree, statusManager);
      return output;
    }

    case 'mermaid': {
      return visualizeMermaidTree(tree);
    }

    default:
      return visualizeTextTree(tree, 0, undefined, true);
  }
}

function gatherContexts(tree: any, contextManager: ContextManager): any {
  const contexts: any = {};
  
  function gather(node: any) {
    const context = contextManager.getContext(node.id);
    if (context) {
      contexts[node.id] = context;
    }
    if (node.children) {
      node.children.forEach(gather);
    }
  }
  
  gather(tree);
  return contexts;
}

function navigateTree(tree: any, maxDepth: number): string {
  let output = `# Interactive Tree Navigation\n\n`;
  output += `## Commands\n`;
  output += `- Use task IDs to get details: \`axiom_mcp_status(action="task", taskId="<id>")\`\n`;
  output += `- Export subtree: \`axiom_mcp_tree(action="export", taskId="<id>", format="markdown")\`\n`;
  output += `- View context: \`axiom_mcp_synthesis(contextId="<id>")\`\n\n`;
  
  output += `## Tree Structure (Interactive)\n\n`;
  output += generateInteractiveTree(tree, 0, maxDepth);
  
  return output;
}

function generateInteractiveTree(tree: any, depth: number, maxDepth: number): string {
  if (depth >= maxDepth) return '';
  
  const indent = '  '.repeat(depth);
  const statusIcon = getStatusIcon(tree.status);
  let output = `${indent}${statusIcon} [${tree.id}] ${tree.prompt.substring(0, 60)}...\n`;
  
  if (tree.children && tree.children.length > 0) {
    tree.children.forEach((child: any) => {
      output += generateInteractiveTree(child, depth + 1, maxDepth);
    });
  }
  
  return output;
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'running': return '🔄';
    case 'pending': return '⏳';
    default: return '❓';
  }
}