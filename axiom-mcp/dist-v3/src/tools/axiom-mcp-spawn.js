import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { v4 as uuidv4 } from 'uuid';
import { detectTaskType, getSystemPrompt } from '../task-types.js';
import { execSync } from 'child_process';
export const axiomMcpSpawnSchema = z.object({
    parentPrompt: z.string().describe('The main task that will spawn subtasks'),
    spawnPattern: z.enum(['decompose', 'parallel', 'sequential', 'recursive']).describe('How to spawn subtasks'),
    spawnCount: z.number().min(1).max(10).default(3).describe('Number of subtasks to spawn'),
    maxDepth: z.number().min(1).max(5).default(3).describe('Maximum recursion depth'),
    autoExecute: z.boolean().default(true).describe('Automatically execute spawned tasks'),
});
export const axiomMcpSpawnTool = {
    name: 'axiom_mcp_spawn',
    description: 'Execute a task that spawns multiple subtasks, testing recursive capabilities',
    inputSchema: zodToJsonSchema(axiomMcpSpawnSchema),
};
export async function handleAxiomMcpSpawn(input, claudeCode, statusManager) {
    try {
        // Get temporal context
        const startDate = execSync('date', { encoding: 'utf-8' }).trim();
        console.error(`[TEMPORAL] Spawn start: ${startDate}`);
        // Detect task type from parent prompt
        const detectedTaskType = detectTaskType(input.parentPrompt);
        const systemPrompt = getSystemPrompt(detectedTaskType);
        const rootTaskId = uuidv4();
        const rootTask = {
            id: rootTaskId,
            prompt: input.parentPrompt,
            status: 'running',
            startTime: new Date(),
            temporalStartTime: startDate,
            depth: 0,
            childTasks: [],
            taskType: detectedTaskType?.name || 'General',
            taskTypeId: detectedTaskType?.id,
            systemPrompt: systemPrompt,
            mctsStats: {
                visits: 0,
                totalReward: 0,
                averageReward: 0,
                untriedActions: generatePossibleActions(input.parentPrompt, input.spawnPattern),
                lastVisited: new Date(),
            },
        };
        statusManager.addTask(rootTask);
        // Build the spawning prompt based on pattern
        let spawnPrompt = '';
        switch (input.spawnPattern) {
            case 'decompose':
                spawnPrompt = `
Task: ${input.parentPrompt}

Please analyze this task and decompose it into exactly ${input.spawnCount} subtasks.
Output ONLY a JSON array of subtask descriptions, nothing else.
Example format: ["Subtask 1 description", "Subtask 2 description", "Subtask 3 description"]
`;
                break;
            case 'parallel':
                spawnPrompt = `
Task: ${input.parentPrompt}

Create ${input.spawnCount} parallel research questions related to this task.
Output ONLY a JSON array of questions, nothing else.
Example format: ["Question 1", "Question 2", "Question 3"]
`;
                break;
            case 'sequential':
                spawnPrompt = `
Task: ${input.parentPrompt}

Break this down into ${input.spawnCount} sequential steps that must be done in order.
Output ONLY a JSON array of steps, nothing else.
Example format: ["Step 1", "Step 2", "Step 3"]
`;
                break;
            case 'recursive':
                spawnPrompt = `
Task: ${input.parentPrompt}

Identify the core subtask that would benefit from further decomposition.
Then create ${input.spawnCount} variations or aspects of that core subtask.
Output ONLY a JSON array with the core task first, then variations.
Example format: ["Core subtask", "Variation 1", "Variation 2"]
`;
                break;
        }
        // Execute the spawning prompt
        console.error(`[SPAWN] Executing parent task to generate ${input.spawnCount} subtasks...`);
        const spawnResult = await claudeCode.execute(spawnPrompt, {
            timeout: 60000, // 1 minute for decomposition
        });
        statusManager.updateTask(rootTaskId, {
            output: spawnResult.response,
        });
        // Parse the subtasks
        let subtasks = [];
        try {
            // Try to extract JSON from the response
            const jsonMatch = spawnResult.response.match(/\[.*\]/s);
            if (jsonMatch) {
                subtasks = JSON.parse(jsonMatch[0]);
            }
            else {
                throw new Error('No JSON array found in response');
            }
        }
        catch (parseError) {
            console.error(`[SPAWN] Failed to parse subtasks: ${parseError}`);
            statusManager.updateTask(rootTaskId, {
                status: 'failed',
                error: `Failed to parse subtasks: ${parseError}`,
            });
            return {
                content: [{
                        type: 'text',
                        text: `Failed to parse subtasks from response:\n${spawnResult.response}`,
                    }],
            };
        }
        console.error(`[SPAWN] Generated ${subtasks.length} subtasks`);
        // Create and optionally execute subtasks
        const childTaskIds = [];
        const childPromises = [];
        for (let i = 0; i < subtasks.length; i++) {
            const subtask = subtasks[i];
            const childId = uuidv4();
            childTaskIds.push(childId);
            const childTask = {
                id: childId,
                prompt: subtask,
                status: 'pending',
                startTime: new Date(),
                temporalStartTime: execSync('date', { encoding: 'utf-8' }).trim(),
                depth: rootTask.depth + 1,
                parentTask: rootTaskId,
                childTasks: [],
                // Inherit task type from parent
                taskType: rootTask.taskType,
                taskTypeId: rootTask.taskTypeId,
                systemPrompt: rootTask.systemPrompt,
            };
            statusManager.addTask(childTask);
            if (input.autoExecute) {
                // Check if we should spawn more tasks (recursive pattern and not at max depth)
                if (input.spawnPattern === 'recursive' && childTask.depth < input.maxDepth && i === 0) {
                    // The first subtask in recursive pattern spawns more
                    console.error(`[SPAWN] Recursively spawning from subtask ${childId}`);
                    childPromises.push(handleAxiomMcpSpawn({
                        parentPrompt: subtask,
                        spawnPattern: 'recursive',
                        spawnCount: Math.max(1, input.spawnCount - 1),
                        maxDepth: input.maxDepth,
                        autoExecute: true,
                    }, claudeCode, statusManager).then((result) => {
                        const endDate = execSync('date', { encoding: 'utf-8' }).trim();
                        statusManager.updateTask(childId, {
                            status: 'completed',
                            output: result.content[0].text,
                            temporalEndTime: endDate,
                        });
                        return result;
                    }).catch((error) => {
                        const endDate = execSync('date', { encoding: 'utf-8' }).trim();
                        statusManager.updateTask(childId, {
                            status: 'failed',
                            error: error.message,
                            temporalEndTime: endDate,
                        });
                        throw error;
                    }));
                }
                else {
                    // Execute the subtask normally
                    console.error(`[SPAWN] Executing subtask ${childId}: ${subtask.substring(0, 50)}...`);
                    statusManager.updateTask(childId, { status: 'running' });
                    childPromises.push(claudeCode.execute(subtask, {
                        timeout: 120000, // 2 minutes per subtask
                        systemPrompt: rootTask.systemPrompt,
                        taskType: rootTask.taskTypeId,
                        includeDate: true,
                    }).then(result => {
                        statusManager.updateTask(childId, {
                            status: 'completed',
                            output: result.response,
                            temporalEndTime: result.endTime,
                        });
                        return result;
                    }).catch(error => {
                        const endDate = execSync('date', { encoding: 'utf-8' }).trim();
                        statusManager.updateTask(childId, {
                            status: 'failed',
                            error: error.message,
                            temporalEndTime: endDate,
                        });
                        throw error;
                    }));
                }
            }
        }
        // Update root task with children
        statusManager.updateTask(rootTaskId, {
            childTasks: childTaskIds,
        });
        // Wait for execution if auto-executing
        let executionResults = [];
        if (input.autoExecute) {
            console.error(`[SPAWN] Waiting for ${childPromises.length} subtasks to complete...`);
            executionResults = await Promise.allSettled(childPromises);
        }
        // Update root task status
        const endDate = execSync('date', { encoding: 'utf-8' }).trim();
        console.error(`[TEMPORAL] Spawn end: ${endDate}`);
        statusManager.updateTask(rootTaskId, {
            status: 'completed',
            temporalEndTime: endDate,
        });
        // Generate output
        let output = `# Task Spawning Results\n\n`;
        output += `**Pattern**: ${input.spawnPattern}\n`;
        output += `**Parent Task**: ${input.parentPrompt}\n`;
        output += `**Task Type**: ${rootTask.taskType} (${rootTask.taskTypeId || 'general'})\n`;
        output += `**Subtasks Generated**: ${subtasks.length}\n`;
        output += `**Max Depth**: ${input.maxDepth}\n`;
        output += `**Started**: ${startDate}\n`;
        output += `**Completed**: ${endDate}\n\n`;
        output += `## Subtasks\n\n`;
        for (let i = 0; i < subtasks.length; i++) {
            const childId = childTaskIds[i];
            const childStatus = statusManager.getTask(childId);
            output += `### ${i + 1}. ${subtasks[i]}\n`;
            output += `- **ID**: ${childId}\n`;
            output += `- **Status**: ${childStatus?.status || 'Unknown'}\n`;
            if (input.autoExecute && executionResults[i]) {
                const result = executionResults[i];
                if (result.status === 'fulfilled') {
                    const taskOutput = childStatus?.output || '';
                    output += `- **Output**: ${taskOutput.substring(0, 200)}${taskOutput.length > 200 ? '...' : ''}\n`;
                }
                else {
                    output += `- **Error**: ${result.reason}\n`;
                }
            }
            // Show recursive children if any
            if (childStatus?.childTasks && childStatus.childTasks.length > 0) {
                output += `- **Spawned ${childStatus.childTasks.length} more subtasks** (depth ${childStatus.depth + 1})\n`;
            }
            output += '\n';
        }
        // Show task tree
        output += `## Task Tree\n\n`;
        const tree = statusManager.getTaskTree(rootTaskId);
        output += formatSimpleTree(tree, 0);
        return {
            content: [
                {
                    type: 'text',
                    text: output,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Spawn operation failed: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
        };
    }
}
function formatSimpleTree(task, depth) {
    const indent = '  '.repeat(depth);
    let output = `${indent}• ${task.prompt.substring(0, 60)}... [${task.status}]`;
    // Show MCTS stats if available
    if (task.mctsStats) {
        const reward = (task.mctsStats.averageReward * 100).toFixed(1);
        output += ` (${reward}% | ${task.mctsStats.visits} visits)`;
    }
    output += '\n';
    if (task.children && task.children.length > 0) {
        task.children.forEach((child) => {
            output += formatSimpleTree(child, depth + 1);
        });
    }
    return output;
}
/**
 * Generate possible actions based on task and pattern
 */
function generatePossibleActions(prompt, pattern) {
    const actions = [];
    switch (pattern) {
        case 'decompose':
            actions.push('Break into functional components');
            actions.push('Separate by concerns');
            actions.push('Divide by complexity');
            actions.push('Split by dependencies');
            break;
        case 'parallel':
            actions.push('Research different aspects');
            actions.push('Explore alternative approaches');
            actions.push('Investigate related concepts');
            actions.push('Analyze from different perspectives');
            break;
        case 'sequential':
            actions.push('Step-by-step implementation');
            actions.push('Phase-based approach');
            actions.push('Incremental development');
            actions.push('Waterfall methodology');
            break;
        case 'recursive':
            actions.push('Depth-first exploration');
            actions.push('Divide and conquer');
            actions.push('Hierarchical decomposition');
            actions.push('Fractal expansion');
            break;
    }
    return actions;
}
/**
 * Calculate UCB1 score for action selection
 */
function calculateUCB1(childStats, parentVisits, explorationConstant = Math.sqrt(2)) {
    if (!childStats || childStats.visits === 0) {
        return Infinity; // Unexplored actions have infinite score
    }
    const exploitation = childStats.averageReward;
    const exploration = explorationConstant * Math.sqrt(Math.log(parentVisits) / childStats.visits);
    return exploitation + exploration;
}
/**
 * Select best action using UCB1
 */
function selectBestAction(parentTask, childTasks, statusManager) {
    const parentVisits = parentTask.mctsStats?.visits || 1;
    // If there are untried actions, pick one randomly
    if (parentTask.mctsStats?.untriedActions && parentTask.mctsStats.untriedActions.length > 0) {
        const randomIndex = Math.floor(Math.random() * parentTask.mctsStats.untriedActions.length);
        return parentTask.mctsStats.untriedActions[randomIndex];
    }
    // Otherwise, use UCB1 to select among existing children
    let bestScore = -Infinity;
    let bestChild = null;
    for (const child of childTasks) {
        const score = calculateUCB1(child.mctsStats, parentVisits);
        if (score > bestScore) {
            bestScore = score;
            bestChild = child;
        }
    }
    return bestChild ? `Refine: ${bestChild.prompt}` : null;
}
//# sourceMappingURL=axiom-mcp-spawn.js.map