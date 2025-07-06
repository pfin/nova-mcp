import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
import { StatusManager, TaskStatus } from '../status-manager.js';
import { MCTSEngine, MCTSConfig } from '../mcts-engine.js';
import { v4 as uuidv4 } from 'uuid';
import { detectTaskType, getSystemPrompt } from '../task-types.js';
import { execSync } from 'child_process';

export const axiomMcpSpawnMctsSchema = z.object({
  parentPrompt: z.string().describe('The main task that will spawn subtasks using MCTS'),
  mctsConfig: z.object({
    explorationConstant: z.number().default(Math.sqrt(2)).describe('UCB1 exploration constant'),
    maxIterations: z.number().min(1).max(100).default(20).describe('MCTS iterations'),
    maxDepth: z.number().min(1).max(5).default(3).describe('Maximum tree depth'),
    simulationMode: z.enum(['fast', 'full', 'mixed']).default('mixed').describe('Simulation strategy'),
    minQualityThreshold: z.number().min(0).max(1).default(0.7).describe('Minimum quality for terminal nodes'),
  }).optional(),
  autoExecute: z.boolean().default(true).describe('Execute best path automatically'),
});

export type axiomMcpSpawnMctsInput = z.infer<typeof axiomMcpSpawnMctsSchema>;

export const axiomMcpSpawnMctsTool = {
  name: 'axiom_mcp_spawn_mcts',
  description: 'Execute a task using Monte Carlo Tree Search for intelligent exploration and exploitation',
  inputSchema: zodToJsonSchema(axiomMcpSpawnMctsSchema),
};

export async function handleAxiomMcpSpawnMcts(
  input: axiomMcpSpawnMctsInput,
  claudeCode: ClaudeCodeSubprocess,
  statusManager: StatusManager
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Get temporal context
    const startDate = execSync('date', { encoding: 'utf-8' }).trim();
    console.error(`[MCTS] Starting MCTS search at: ${startDate}`);
    
    // Detect task type
    const detectedTaskType = detectTaskType(input.parentPrompt);
    const systemPrompt = getSystemPrompt(detectedTaskType);
    
    // Create MCTS config
    const mctsConfig: MCTSConfig = {
      explorationConstant: input.mctsConfig?.explorationConstant || Math.sqrt(2),
      maxIterations: input.mctsConfig?.maxIterations || 20,
      maxDepth: input.mctsConfig?.maxDepth || 3,
      maxTime: 600000, // 10 minutes
      simulationMode: input.mctsConfig?.simulationMode || 'mixed',
      parallelWorkers: 1,
      fastSimulationTimeout: 30000,
      fullRolloutTimeout: 300000,
      minQualityThreshold: input.mctsConfig?.minQualityThreshold || 0.7,
    };
    
    // Create MCTS engine
    const mctsEngine = new MCTSEngine(claudeCode, mctsConfig);
    
    // Run MCTS search
    console.error(`[MCTS] Running ${mctsConfig.maxIterations} iterations with ${mctsConfig.simulationMode} mode...`);
    const bestNode = await mctsEngine.search(input.parentPrompt);
    
    // Get statistics
    const stats = mctsEngine.getStatistics();
    
    // Create root task for tracking
    const rootTaskId = uuidv4();
    const rootTask: TaskStatus = {
      id: rootTaskId,
      prompt: input.parentPrompt,
      status: 'completed',
      startTime: new Date(),
      temporalStartTime: startDate,
      depth: 0,
      childTasks: [],
      taskType: detectedTaskType?.name || 'General',
      taskTypeId: detectedTaskType?.id,
      systemPrompt: systemPrompt,
      mctsStats: {
        visits: stats.iterations,
        totalReward: bestNode.totalReward,
        averageReward: bestNode.averageReward,
        untriedActions: [],
        simulationMode: mctsConfig.simulationMode,
        lastVisited: new Date(),
      },
    };
    
    statusManager.addTask(rootTask);
    
    // Format output
    let output = `# MCTS Task Execution Results\n\n`;
    output += `**Task**: ${input.parentPrompt}\n`;
    output += `**Task Type**: ${rootTask.taskType} (${rootTask.taskTypeId || 'general'})\n`;
    output += `**Started**: ${startDate}\n\n`;
    
    output += `## MCTS Statistics\n`;
    output += `- **Total Iterations**: ${stats.iterations}\n`;
    output += `- **Nodes Explored**: ${stats.totalNodes}\n`;
    output += `- **Max Depth Reached**: ${stats.maxDepth}\n`;
    output += `- **Best Reward**: ${(stats.bestReward * 100).toFixed(1)}%\n`;
    output += `- **Time Elapsed**: ${(stats.timeElapsed / 1000).toFixed(1)}s\n`;
    output += `- **Exploration Constant**: ${mctsConfig.explorationConstant.toFixed(2)}\n`;
    output += `- **Simulation Mode**: ${mctsConfig.simulationMode}\n\n`;
    
    output += `## Best Solution Found\n`;
    output += `**Task**: ${bestNode.task}\n`;
    output += `**Score**: ${(bestNode.averageReward * 100).toFixed(1)}%\n`;
    output += `**Visits**: ${bestNode.visits}\n`;
    output += `**Depth**: ${bestNode.depth}\n\n`;
    
    if (bestNode.implementation) {
      output += `### Implementation\n`;
      output += '```\n';
      output += bestNode.implementation.code.substring(0, 1000);
      if (bestNode.implementation.code.length > 1000) {
        output += '\n... (truncated)';
      }
      output += '\n```\n\n';
      
      if (bestNode.implementation.security) {
        output += `### Security Analysis\n`;
        output += `- **Passed**: ${bestNode.implementation.security.passed ? '✅' : '❌'}\n`;
        output += `- **Critical Issues**: ${bestNode.implementation.security.summary.critical}\n`;
        output += `- **High Issues**: ${bestNode.implementation.security.summary.high}\n`;
        output += `- **Medium Issues**: ${bestNode.implementation.security.summary.medium}\n`;
        output += `- **Low Issues**: ${bestNode.implementation.security.summary.low}\n\n`;
      }
    }
    
    // Show exploration path
    output += `## Exploration Path\n`;
    output += formatMCTSPath(bestNode);
    
    // Update root task with results
    const endDate = execSync('date', { encoding: 'utf-8' }).trim();
    statusManager.updateTask(rootTaskId, {
      output: output,
      temporalEndTime: endDate,
    });
    
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
          text: `MCTS spawn operation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

function formatMCTSPath(node: any): string {
  let output = '';
  let current = node;
  const path: any[] = [];
  
  // Build path from node to root
  while (current) {
    path.unshift(current);
    current = current.parent;
  }
  
  // Format path
  path.forEach((n, index) => {
    const indent = '  '.repeat(index);
    const score = (n.averageReward * 100).toFixed(1);
    const visits = n.visits;
    output += `${indent}└─ [${score}% | ${visits} visits] ${n.task.substring(0, 60)}...\n`;
  });
  
  return output;
}