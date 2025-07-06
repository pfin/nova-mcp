import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { PtyExecutor } from '../executors/pty-executor.js';
import { v4 as uuidv4 } from 'uuid';
import { detectTaskType, getSystemPrompt } from '../config/task-types.js';
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StreamParser } from '../parsers/stream-parser.js';
export const axiomMcpSpawnSchema = z.object({
    parentPrompt: z.string().describe('The main task that will spawn subtasks'),
    spawnPattern: z.enum(['decompose', 'parallel', 'sequential', 'recursive']).describe('How to spawn subtasks'),
    spawnCount: z.number().min(1).max(10).default(3).describe('Number of subtasks to spawn'),
    maxDepth: z.number().min(1).max(5).default(3).describe('Maximum recursion depth'),
    autoExecute: z.boolean().default(true).describe('Automatically execute spawned tasks'),
});
export const axiomMcpSpawnTool = {
    name: 'axiom_mcp_spawn',
    description: 'Execute a task that spawns multiple subtasks with recursive capabilities',
    inputSchema: zodToJsonSchema(axiomMcpSpawnSchema),
};
// Helper to capture file system state
async function captureFileState(dir) {
    const files = new Set();
    async function walk(currentPath) {
        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    await walk(fullPath);
                }
                else if (entry.isFile()) {
                    files.add(fullPath);
                }
            }
        }
        catch (error) {
            // Ignore permission errors
        }
    }
    await walk(dir);
    return files;
}
// Helper to execute with PTY
async function executeWithPty(prompt, taskId, systemPrompt, conversationDB) {
    const executor = new PtyExecutor({
        cwd: process.cwd(),
        enableMonitoring: true,
        enableIntervention: true,
    });
    let output = '';
    let hasError = false;
    const streamParser = new StreamParser();
    executor.on('data', (event) => {
        if (event.type === 'data') {
            output += event.payload;
            // Parse stream and store in database
            if (conversationDB) {
                const events = streamParser.parse(event.payload);
                // Store raw stream chunk
                conversationDB.createStream({
                    id: uuidv4(),
                    conversation_id: taskId,
                    chunk: event.payload,
                    parsed_data: events.length > 0 ? { events } : undefined,
                    timestamp: new Date().toISOString(),
                }).catch(err => console.error('[DB] Stream storage error:', err));
                // Store significant events as actions
                for (const evt of events) {
                    if (evt.type !== 'output_chunk') {
                        conversationDB.createAction({
                            id: uuidv4(),
                            conversation_id: taskId,
                            timestamp: evt.timestamp,
                            type: evt.type,
                            content: evt.content,
                            metadata: evt.metadata,
                        }).catch(err => console.error('[DB] Action storage error:', err));
                    }
                }
            }
        }
    });
    executor.on('error', (event) => {
        hasError = true;
        console.error(`[PTY ERROR] ${event.payload}`);
        if (conversationDB) {
            conversationDB.createAction({
                id: uuidv4(),
                conversation_id: taskId,
                timestamp: new Date().toISOString(),
                type: 'error',
                content: event.payload,
                metadata: { errorType: 'pty_error' }
            }).catch(err => console.error('[DB] Error storage failed:', err));
        }
    });
    // Build the full command with system prompt
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    // Execute using Claude CLI directly through PTY
    const claudeCommand = 'claude';
    const claudeArgs = []; // No --print flag to enable direct execution
    console.error(`[PTY] Executing task ${taskId} with prompt length: ${fullPrompt.length}`);
    try {
        // Write prompt to temp file to avoid shell escaping issues
        const tempFile = `/tmp/axiom-prompt-${taskId}.txt`;
        await fs.writeFile(tempFile, fullPrompt);
        // Execute claude with prompt from file
        await executor.execute('bash', ['-c', `cat "${tempFile}" | ${claudeCommand} ${claudeArgs.join(' ')}`], taskId);
        // Clean up temp file
        await fs.unlink(tempFile).catch(() => { });
        if (hasError) {
            throw new Error('Execution failed with errors');
        }
        return output;
    }
    finally {
        executor.cleanup();
    }
}
export async function handleAxiomMcpSpawn(input, statusManager, conversationDB) {
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
        };
        statusManager.addTask(rootTask);
        // Create conversation in database
        if (conversationDB) {
            await conversationDB.createConversation({
                id: rootTaskId,
                parent_id: undefined,
                started_at: new Date().toISOString(),
                status: 'active',
                depth: 0,
                prompt: input.parentPrompt,
                task_type: detectedTaskType?.name || 'General',
                metadata: {
                    spawnPattern: input.spawnPattern,
                    spawnCount: input.spawnCount,
                    maxDepth: input.maxDepth,
                }
            });
        }
        // Capture initial file state
        const filesBefore = await captureFileState(process.cwd());
        // Build the spawning prompt based on pattern
        let spawnPrompt = '';
        switch (input.spawnPattern) {
            case 'decompose':
                spawnPrompt = `
# CRITICAL: You MUST implement actual code, not just describe what you would do.

Task: ${input.parentPrompt}

First, implement a working solution for this task. Write actual code files.
Then, decompose the implementation into exactly ${input.spawnCount} subtasks for further enhancement.

Requirements:
1. CREATE actual code files first
2. Ensure the code compiles/runs
3. THEN output a JSON array of ${input.spawnCount} enhancement subtasks
4. The JSON must be on its own line like: ["Enhancement 1", "Enhancement 2", "Enhancement 3"]
`;
                break;
            case 'parallel':
                spawnPrompt = `
# CRITICAL: You MUST implement actual code, not just plan.

Task: ${input.parentPrompt}

Create ${input.spawnCount} different implementation approaches for this task.
Start by implementing the first approach with actual code.

Requirements:
1. Write WORKING CODE for at least one approach
2. Create actual files that can be tested
3. Output a JSON array of ${input.spawnCount} different implementation strategies
4. Format: ["Approach 1: REST API", "Approach 2: GraphQL", "Approach 3: WebSocket"]
`;
                break;
            case 'sequential':
                spawnPrompt = `
# CRITICAL: You MUST implement code at each step.

Task: ${input.parentPrompt}

Implement this task step by step, creating actual code at each stage.
Break it into ${input.spawnCount} sequential implementation steps.

Requirements:
1. Start implementing the first step NOW with real code
2. Each step must produce working code
3. Output a JSON array of the ${input.spawnCount} sequential steps
4. Format: ["Step 1: Create models", "Step 2: Add API endpoints", "Step 3: Write tests"]
`;
                break;
            case 'recursive':
                spawnPrompt = `
# CRITICAL: You MUST write actual code, not just analyze.

Task: ${input.parentPrompt}

Begin implementing this task immediately. Create real, working code.
Then identify aspects that need deeper implementation.

Requirements:
1. IMPLEMENT the core functionality with actual code files
2. Make sure the code works
3. Output a JSON array with the core task and ${input.spawnCount - 1} deep-dive areas
4. Format: ["Core implementation", "Performance optimization", "Security hardening"]
`;
                break;
        }
        // Add enforcement rules
        spawnPrompt += `

# ENFORCEMENT RULES:
- If you write "I would implement" or "I would create", STOP and write actual code instead
- If you write "TODO" or "FIXME", STOP and implement it now
- Every response MUST create at least one new code file
- Use appropriate file extensions (.ts, .js, .py, etc.)
- The code must be complete and runnable, not snippets
`;
        // Execute the spawning prompt with PTY
        console.error(`[SPAWN] Executing parent task with PTY to generate ${input.spawnCount} subtasks...`);
        const spawnResult = await executeWithPty(spawnPrompt, rootTaskId, systemPrompt, conversationDB);
        // Check if any files were created
        const filesAfter = await captureFileState(process.cwd());
        const newFiles = Array.from(filesAfter).filter(f => !filesBefore.has(f));
        if (newFiles.length === 0) {
            const errorMsg = 'VIOLATION: No files were created. The task produced only research/planning instead of implementation.';
            console.error(`[SPAWN] ${errorMsg}`);
            statusManager.updateTask(rootTaskId, {
                status: 'failed',
                error: errorMsg,
                output: spawnResult,
            });
            return {
                content: [{
                        type: 'text',
                        text: `❌ EXECUTION FAILED - No Implementation Detected\n\n${errorMsg}\n\nOutput was:\n${spawnResult}\n\nThe system must be fixed to produce actual code.`,
                    }],
            };
        }
        console.error(`[SPAWN] Created ${newFiles.length} new files: ${newFiles.join(', ')}`);
        statusManager.updateTask(rootTaskId, {
            output: spawnResult,
            metadata: {
                filesCreated: newFiles,
                fileCount: newFiles.length,
            },
        });
        // Parse the subtasks
        let subtasks = [];
        try {
            // Try to extract JSON from the response
            const jsonMatch = spawnResult.match(/\[.*\]/s);
            if (jsonMatch) {
                subtasks = JSON.parse(jsonMatch[0]);
            }
            else {
                // If no JSON found, that's OK as long as we created files
                console.error(`[SPAWN] No subtask JSON found, but created ${newFiles.length} files - marking as success`);
                statusManager.updateTask(rootTaskId, {
                    status: 'completed',
                    temporalEndTime: execSync('date', { encoding: 'utf-8' }).trim(),
                });
                return {
                    content: [{
                            type: 'text',
                            text: `✅ Task completed successfully!\n\nCreated ${newFiles.length} files:\n${newFiles.map(f => `- ${f}`).join('\n')}\n\nOutput:\n${spawnResult}`,
                        }],
                };
            }
        }
        catch (parseError) {
            console.error(`[SPAWN] Failed to parse subtasks: ${parseError}`);
            // Still successful if we created files
            statusManager.updateTask(rootTaskId, {
                status: 'completed',
                metadata: {
                    parseError: parseError instanceof Error ? parseError.message : String(parseError),
                    filesCreated: newFiles,
                },
            });
            return {
                content: [{
                        type: 'text',
                        text: `✅ Task completed with implementation!\n\nCreated ${newFiles.length} files:\n${newFiles.map(f => `- ${f}`).join('\n')}\n\nCouldn't parse subtasks but implementation succeeded.`,
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
                taskType: rootTask.taskType,
                taskTypeId: rootTask.taskTypeId,
                systemPrompt: rootTask.systemPrompt,
            };
            statusManager.addTask(childTask);
            // Create child conversation in database
            if (conversationDB) {
                await conversationDB.createConversation({
                    id: childId,
                    parent_id: rootTaskId,
                    started_at: new Date().toISOString(),
                    status: 'active',
                    depth: childTask.depth,
                    prompt: subtask,
                    task_type: rootTask.taskType,
                    metadata: { index: i }
                });
            }
            if (input.autoExecute && childTask.depth < input.maxDepth) {
                // Execute child tasks
                console.error(`[SPAWN] Executing child task ${i + 1}/${subtasks.length}: ${subtask.substring(0, 50)}...`);
                const childPromise = executeWithPty(`CRITICAL: You must implement actual code, not just describe.\n\n${subtask}`, childId, systemPrompt, conversationDB).then(output => {
                    const endDate = execSync('date', { encoding: 'utf-8' }).trim();
                    statusManager.updateTask(childId, {
                        status: 'completed',
                        output: output,
                        temporalEndTime: endDate,
                    });
                    // Update database status
                    if (conversationDB) {
                        conversationDB.updateConversationStatus(childId, 'completed')
                            .catch(err => console.error('[DB] Status update failed:', err));
                    }
                    return output;
                }).catch(error => {
                    const endDate = execSync('date', { encoding: 'utf-8' }).trim();
                    statusManager.updateTask(childId, {
                        status: 'failed',
                        error: error.message,
                        temporalEndTime: endDate,
                    });
                    // Update database status
                    if (conversationDB) {
                        conversationDB.updateConversationStatus(childId, 'failed')
                            .catch(err => console.error('[DB] Status update failed:', err));
                    }
                    throw error;
                });
                childPromises.push(childPromise);
            }
        }
        // Update root task with child IDs
        statusManager.updateTask(rootTaskId, {
            childTasks: childTaskIds,
        });
        // Wait for all child tasks if auto-executing
        if (input.autoExecute && childPromises.length > 0) {
            console.error(`[SPAWN] Waiting for ${childPromises.length} child tasks to complete...`);
            await Promise.allSettled(childPromises);
        }
        // Get final status
        const endDate = execSync('date', { encoding: 'utf-8' }).trim();
        const finalTask = statusManager.getTask(rootTaskId);
        const childStatuses = childTaskIds.map(id => statusManager.getTask(id));
        statusManager.updateTask(rootTaskId, {
            status: 'completed',
            temporalEndTime: endDate,
        });
        // Update root task status in database
        if (conversationDB) {
            await conversationDB.updateConversationStatus(rootTaskId, 'completed');
        }
        // Build comprehensive output
        let output = `# Axiom MCP Spawn Execution Report\n\n`;
        output += `## Parent Task\n${input.parentPrompt}\n\n`;
        output += `## Execution Summary\n`;
        output += `- Pattern: ${input.spawnPattern}\n`;
        output += `- Files Created: ${newFiles.length}\n`;
        output += `- Subtasks Generated: ${subtasks.length}\n`;
        output += `- Subtasks Executed: ${childPromises.length}\n\n`;
        if (newFiles.length > 0) {
            output += `## Files Created\n`;
            newFiles.forEach(f => output += `- ${f}\n`);
            output += '\n';
        }
        output += `## Parent Task Output\n\`\`\`\n${spawnResult}\n\`\`\`\n\n`;
        if (childStatuses.length > 0) {
            output += `## Subtask Results\n`;
            childStatuses.forEach((child, i) => {
                if (child) {
                    output += `### ${i + 1}. ${subtasks[i]}\n`;
                    output += `Status: ${child.status}\n`;
                    if (child.output) {
                        output += `Output preview: ${child.output.substring(0, 200)}...\n`;
                    }
                    output += '\n';
                }
            });
        }
        return {
            content: [{
                    type: 'text',
                    text: output,
                }],
        };
    }
    catch (error) {
        console.error(`[SPAWN] Fatal error:`, error);
        return {
            content: [{
                    type: 'text',
                    text: `Error in axiom_mcp_spawn: ${error instanceof Error ? error.message : String(error)}`,
                }],
        };
    }
}
//# sourceMappingURL=axiom-mcp-spawn.js.map