import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { v4 as uuidv4 } from 'uuid';
import { streamManager } from '../stream-manager.js';
export const axiomMcpSpawnStreamingSchema = z.object({
    parentPrompt: z.string().describe('The main task that will spawn subtasks'),
    spawnPattern: z.enum(['decompose', 'parallel', 'sequential', 'recursive']).describe('How to spawn subtasks'),
    spawnCount: z.number().min(1).max(10).default(3).describe('Number of subtasks to spawn'),
    maxDepth: z.number().min(1).max(5).default(3).describe('Maximum recursion depth'),
    autoExecute: z.boolean().default(true).describe('Automatically execute spawned tasks'),
    streamToMaster: z.boolean().default(true).describe('Stream all updates to master terminal'),
});
export const axiomMcpSpawnStreamingTool = {
    name: 'axiom_mcp_spawn_streaming',
    description: 'Execute a task that spawns multiple subtasks with live streaming to master terminal',
    inputSchema: zodToJsonSchema(axiomMcpSpawnStreamingSchema),
};
export async function handleAxiomMcpSpawnStreaming(input, claudeCode, statusManager, parentTaskId, taskPath = []) {
    try {
        const rootTaskId = uuidv4();
        const rootTask = {
            id: rootTaskId,
            prompt: input.parentPrompt,
            status: 'running',
            startTime: new Date(),
            parentTask: parentTaskId,
            depth: taskPath.length,
            childTasks: [],
        };
        // Update status manager
        statusManager.updateTask(rootTaskId, rootTask);
        // Create stream channel for this spawn tree
        const channelId = streamManager.createChannel(`spawn-${rootTaskId}`, 5000);
        // Stream initial status
        if (input.streamToMaster) {
            streamManager.streamUpdate({
                id: uuidv4(),
                taskId: rootTaskId,
                parentTaskId,
                level: taskPath.length,
                type: 'status',
                timestamp: new Date(),
                data: {
                    status: 'spawning',
                    pattern: input.spawnPattern,
                    count: input.spawnCount,
                    maxDepth: input.maxDepth
                },
                source: `Spawn ${rootTaskId.substring(0, 8)}`,
                path: taskPath
            });
        }
        // Generate spawn prompts based on pattern
        const subtaskPrompts = generateSubtaskPrompts(input.parentPrompt, input.spawnPattern, input.spawnCount);
        // Create subtasks with proper parent-child relationships
        const subtasks = [];
        for (let i = 0; i < subtaskPrompts.length; i++) {
            const subtaskId = uuidv4();
            const subtask = {
                id: subtaskId,
                prompt: subtaskPrompts[i],
                status: 'pending',
                startTime: new Date(),
                parentTask: rootTaskId,
                depth: taskPath.length + 1,
                childTasks: [],
            };
            subtasks.push(subtask);
            rootTask.childTasks.push(subtaskId);
            statusManager.updateTask(subtaskId, subtask);
            // Stream subtask creation
            if (input.streamToMaster) {
                streamManager.streamUpdate({
                    id: uuidv4(),
                    taskId: subtaskId,
                    parentTaskId: rootTaskId,
                    level: taskPath.length + 1,
                    type: 'status',
                    timestamp: new Date(),
                    data: {
                        status: 'created',
                        index: i + 1,
                        total: subtaskPrompts.length,
                        prompt: subtaskPrompts[i].substring(0, 100) + '...'
                    },
                    source: `Subtask ${subtaskId.substring(0, 8)}`,
                    path: [...taskPath, rootTaskId]
                });
            }
        }
        // Execute subtasks if requested
        if (input.autoExecute) {
            const newPath = [...taskPath, rootTaskId];
            // For recursive pattern, execute sequentially and allow first to spawn more
            if (input.spawnPattern === 'recursive' && newPath.length < input.maxDepth) {
                for (let i = 0; i < subtasks.length; i++) {
                    const subtask = subtasks[i];
                    try {
                        subtask.status = 'running';
                        statusManager.updateTask(subtask.id, subtask);
                        // Execute with streaming
                        const result = await claudeCode.execute(subtask.prompt, subtask.id, {
                            streamToParent: true,
                            parentTaskId: rootTaskId,
                            taskPath: newPath
                        });
                        subtask.status = 'completed';
                        subtask.output = result.output;
                        subtask.duration = result.duration;
                        statusManager.updateTask(subtask.id, subtask);
                        // First subtask can spawn more if under depth limit
                        if (i === 0 && newPath.length < input.maxDepth - 1) {
                            // Recursively spawn more tasks
                            await handleAxiomMcpSpawnStreaming({
                                ...input,
                                parentPrompt: `Based on the previous analysis:\n${result.output}\n\nDeepen the research further.`,
                                spawnCount: Math.max(1, input.spawnCount - 1),
                            }, claudeCode, statusManager, subtask.id, newPath);
                        }
                    }
                    catch (error) {
                        subtask.status = 'failed';
                        subtask.error = error instanceof Error ? error.message : String(error);
                        statusManager.updateTask(subtask.id, subtask);
                        // Stream error
                        if (input.streamToMaster) {
                            streamManager.streamUpdate({
                                id: uuidv4(),
                                taskId: subtask.id,
                                parentTaskId: rootTaskId,
                                level: newPath.length,
                                type: 'error',
                                timestamp: new Date(),
                                data: { error: subtask.error },
                                source: `Subtask ${subtask.id.substring(0, 8)}`,
                                path: newPath
                            });
                        }
                    }
                }
            }
            else {
                // For other patterns, execute in parallel
                const promises = subtasks.map(async (subtask) => {
                    try {
                        subtask.status = 'running';
                        statusManager.updateTask(subtask.id, subtask);
                        const result = await claudeCode.execute(subtask.prompt, subtask.id, {
                            streamToParent: true,
                            parentTaskId: rootTaskId,
                            taskPath: newPath
                        });
                        subtask.status = 'completed';
                        subtask.output = result.output;
                        subtask.duration = result.duration;
                        statusManager.updateTask(subtask.id, subtask);
                    }
                    catch (error) {
                        subtask.status = 'failed';
                        subtask.error = error instanceof Error ? error.message : String(error);
                        statusManager.updateTask(subtask.id, subtask);
                    }
                });
                await Promise.all(promises);
            }
        }
        // Update root task status
        rootTask.status = 'completed';
        statusManager.updateTask(rootTaskId, rootTask);
        // Stream completion
        if (input.streamToMaster) {
            streamManager.streamUpdate({
                id: uuidv4(),
                taskId: rootTaskId,
                parentTaskId,
                level: taskPath.length,
                type: 'complete',
                timestamp: new Date(),
                data: {
                    duration: Date.now() - rootTask.startTime.getTime(),
                    subtasksCompleted: subtasks.filter(t => t.status === 'completed').length,
                    subtasksFailed: subtasks.filter(t => t.status === 'failed').length
                },
                source: `Spawn ${rootTaskId.substring(0, 8)}`,
                path: taskPath
            });
        }
        // Generate output
        let output = `# Task Spawning Complete\n\n`;
        output += `**Pattern**: ${input.spawnPattern}\n`;
        output += `**Root Task**: ${input.parentPrompt}\n`;
        output += `**Task ID**: ${rootTaskId}\n\n`;
        output += `## Spawned Tasks (${subtasks.length})\n\n`;
        for (let i = 0; i < subtasks.length; i++) {
            const subtask = subtasks[i];
            output += `### ${i + 1}. Subtask ${subtask.id.substring(0, 8)}\n`;
            output += `**Status**: ${subtask.status}\n`;
            output += `**Prompt**: ${subtask.prompt}\n`;
            if (subtask.output) {
                output += `**Output Preview**: ${subtask.output.substring(0, 200)}...\n`;
            }
            if (subtask.error) {
                output += `**Error**: ${subtask.error}\n`;
            }
            if (subtask.childTasks && subtask.childTasks.length > 0) {
                output += `**Children**: ${subtask.childTasks.length} tasks spawned\n`;
            }
            output += '\n';
        }
        // Add tree visualization
        const tree = statusManager.getTaskTree(rootTaskId);
        output += `## Task Tree\n\n\`\`\`\n${visualizeTree(tree)}\n\`\`\`\n`;
        // Add streaming info
        output += `\n## Live Streaming\n`;
        output += `- Channel ID: ${channelId}\n`;
        output += `- Updates streamed: ${streamManager.getChannelUpdates(channelId).length}\n`;
        output += `- Dashboard: http://localhost:3456\n`;
        return {
            content: [{
                    type: 'text',
                    text: output
                }]
        };
    }
    catch (error) {
        throw error;
    }
}
function generateSubtaskPrompts(parentPrompt, pattern, count) {
    const prompts = [];
    switch (pattern) {
        case 'decompose':
            // Break down into logical components
            for (let i = 1; i <= count; i++) {
                prompts.push(`
Component ${i} of ${count} for the main task:
"${parentPrompt}"

Focus on a specific aspect or component of this task. Be thorough and detailed.
`);
            }
            break;
        case 'parallel':
            // Create parallel research questions
            const aspects = ['implementation', 'best practices', 'common pitfalls', 'alternatives', 'performance'];
            for (let i = 0; i < Math.min(count, aspects.length); i++) {
                prompts.push(`
Research the ${aspects[i]} aspect of:
"${parentPrompt}"

Provide detailed analysis and concrete examples.
`);
            }
            break;
        case 'sequential':
            // Create sequential steps
            const steps = ['requirements', 'design', 'implementation', 'testing', 'deployment'];
            for (let i = 0; i < Math.min(count, steps.length); i++) {
                prompts.push(`
Step ${i + 1}: ${steps[i]} phase for:
"${parentPrompt}"

Detail what needs to be done in this phase.
`);
            }
            break;
        case 'recursive':
            // First task explores deeply, others explore breadth
            prompts.push(`
Deep dive into the core aspects of:
"${parentPrompt}"

Identify the most critical elements that need further exploration.
`);
            for (let i = 1; i < count; i++) {
                prompts.push(`
Alternative approach ${i} to:
"${parentPrompt}"

Explore a different angle or methodology.
`);
            }
            break;
    }
    return prompts;
}
function visualizeTree(node, prefix = '', isLast = true) {
    let result = prefix + (isLast ? '└── ' : '├── ');
    result += `[${node.status}] ${node.id.substring(0, 8)}: ${node.prompt.substring(0, 50)}...\n`;
    const children = node.children || [];
    children.forEach((child, index) => {
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        result += visualizeTree(child, childPrefix, index === children.length - 1);
    });
    return result;
}
//# sourceMappingURL=axiom-mcp-spawn-streaming.js.map