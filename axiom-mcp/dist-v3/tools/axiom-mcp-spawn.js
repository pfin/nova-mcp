import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { PtyExecutor } from '../executors/pty-executor.js';
import { SdkExecutor } from '../executors/sdk-executor.js';
import { v4 as uuidv4 } from 'uuid';
import { detectTaskType, getSystemPrompt } from '../config/task-types.js';
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StreamParser } from '../parsers/stream-parser.js';
import { RuleVerifier } from '../verifiers/rule-verifier.js';
import { StreamAggregator } from '../aggregators/stream-aggregator.js';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
// Version tracking
export const AXIOM_VERSION = '0.5.0-verbose';
export const axiomMcpSpawnSchema = z.object({
    parentPrompt: z.string().describe('The main task that will spawn subtasks'),
    spawnPattern: z.enum(['decompose', 'parallel', 'sequential', 'recursive']).describe('How to spawn subtasks'),
    spawnCount: z.number().min(1).max(10).default(3).describe('Number of subtasks to spawn'),
    maxDepth: z.number().min(1).max(5).default(3).describe('Maximum recursion depth'),
    autoExecute: z.boolean().default(true).describe('Automatically execute spawned tasks'),
    verboseMasterMode: z.boolean()
        .default(false)
        .describe('Stream all child output in real-time with prefixes'),
    streamingOptions: z.object({
        outputMode: z.enum(['console', 'websocket', 'both']).default('console'),
        colorize: z.boolean().default(true),
        bufferSize: z.number().default(1000),
        flushInterval: z.number().default(100),
        includeTimestamps: z.boolean().default(false),
        prefixLength: z.number().default(8)
    }).optional().describe('Advanced streaming configuration')
});
export const axiomMcpSpawnTool = {
    name: 'axiom_mcp_spawn',
    description: 'Execute a task that spawns multiple subtasks with recursive capabilities (v0.5.0 - Verbose Mode)',
    inputSchema: zodToJsonSchema(axiomMcpSpawnSchema),
};
// Intervention statistics
let interventionStats = {
    totalInterventions: 0,
    planningTimeouts: 0,
    todoViolations: 0,
    progressChecks: 0,
    successfulFileCreation: 0
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
async function executeWithPty(prompt, taskId, systemPrompt, conversationDB, providedExecutor) {
    const executor = providedExecutor || new PtyExecutor({
        cwd: process.cwd(),
        enableMonitoring: true,
        enableIntervention: true,
    });
    let output = '';
    let hasError = false;
    const streamParser = new StreamParser();
    const ruleVerifier = conversationDB ? new RuleVerifier(conversationDB) : null;
    // Intervention tracking
    let lastFileCheckTime = Date.now();
    let planningStartTime = null;
    let hasCreatedFiles = false;
    let interventionCount = 0;
    executor.on('data', async (event) => {
        if (event.type === 'data') {
            output += event.payload;
            // Parse stream
            const events = streamParser.parse(event.payload);
            // Store in database (existing functionality)
            if (conversationDB) {
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
            // NEW: Real-time intervention logic
            if (conversationDB && ruleVerifier && events.length > 0) {
                // Check for file creation events
                const fileEvents = events.filter(e => e.type === 'file_created' || e.type === 'file_modified');
                if (fileEvents.length > 0) {
                    hasCreatedFiles = true;
                    planningStartTime = null; // Reset planning timer
                    interventionStats.successfulFileCreation++;
                    console.error('[INTERVENTION] File creation detected - good progress!');
                }
                // Detect planning without execution
                const hasPlanningContent = event.payload.match(/\b(analyzing|planning|considering|exploring|researching|would implement|approach would be)\b/i);
                if (hasPlanningContent && !hasCreatedFiles) {
                    if (!planningStartTime) {
                        planningStartTime = Date.now();
                        console.error('[INTERVENTION] Planning detected, starting 30s timer...');
                    }
                    else if (Date.now() - planningStartTime > 30000) { // 30 seconds
                        // INTERVENTION: Too much planning!
                        const intervention = '\n\n[INTERVENTION] You have been planning for 30 seconds without creating any files. Stop planning and start implementing now! Create a .js, .ts, or .py file with actual code.\n\n';
                        try {
                            await executor.write(intervention);
                            console.error('[INTERVENTION] Triggered: Excessive planning without implementation');
                            interventionStats.totalInterventions++;
                            interventionStats.planningTimeouts++;
                            interventionCount++;
                            // Log intervention
                            await conversationDB.createAction({
                                id: uuidv4(),
                                conversation_id: taskId,
                                timestamp: new Date().toISOString(),
                                type: 'intervention',
                                content: 'Excessive planning without implementation',
                                metadata: {
                                    interventionType: 'planning_timeout',
                                    planningDuration: Date.now() - planningStartTime,
                                    interventionNumber: interventionCount
                                }
                            });
                        }
                        catch (err) {
                            console.error('[INTERVENTION] Failed to write intervention:', err);
                        }
                        planningStartTime = null; // Reset timer
                    }
                }
                // Check for TODOs using verifier
                const latestStream = {
                    id: uuidv4(),
                    conversation_id: taskId,
                    chunk: event.payload,
                    parsed_data: { events },
                    timestamp: new Date().toISOString()
                };
                const violations = await ruleVerifier.verifyInRealTime(taskId, undefined, latestStream);
                if (violations.length > 0) {
                    // INTERVENTION: Rule violation detected
                    const violation = violations[0];
                    const intervention = `\n\n[INTERVENTION] ${violation.suggestion || 'Fix this violation immediately!'}\n\n`;
                    try {
                        await executor.write(intervention);
                        console.error(`[INTERVENTION] ${violation.ruleName}: ${violation.evidence}`);
                        interventionStats.totalInterventions++;
                        interventionStats.todoViolations++;
                        interventionCount++;
                        // Log intervention
                        await conversationDB.createAction({
                            id: uuidv4(),
                            conversation_id: taskId,
                            timestamp: new Date().toISOString(),
                            type: 'intervention',
                            content: violation.suggestion || 'Rule violation detected',
                            metadata: {
                                interventionType: 'rule_violation',
                                ruleId: violation.ruleId,
                                ruleName: violation.ruleName,
                                interventionNumber: interventionCount
                            }
                        });
                    }
                    catch (err) {
                        console.error('[INTERVENTION] Failed to write intervention:', err);
                    }
                }
            }
            // Progress check every 10 seconds
            if (!hasCreatedFiles && Date.now() - lastFileCheckTime > 10000) {
                const progressCheck = '\n\n[PROGRESS CHECK] No files created yet. Remember to write actual code files, not just descriptions. Create a .js, .ts, or .py file now!\n\n';
                try {
                    await executor.write(progressCheck);
                    console.error('[PROGRESS CHECK] No files created after', Math.floor((Date.now() - lastFileCheckTime) / 1000), 'seconds');
                    interventionStats.totalInterventions++;
                    interventionStats.progressChecks++;
                    interventionCount++;
                    if (conversationDB) {
                        await conversationDB.createAction({
                            id: uuidv4(),
                            conversation_id: taskId,
                            timestamp: new Date().toISOString(),
                            type: 'intervention',
                            content: 'Progress check - no files created',
                            metadata: {
                                interventionType: 'progress_check',
                                timeElapsed: Date.now() - lastFileCheckTime,
                                interventionNumber: interventionCount
                            }
                        });
                    }
                }
                catch (err) {
                    console.error('[PROGRESS CHECK] Failed to write check:', err);
                }
                lastFileCheckTime = Date.now();
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
        // Only cleanup if we created the executor
        if (!providedExecutor) {
            executor.cleanup();
        }
    }
}
// Helper to execute with SDK (for non-interactive tasks)
async function executeWithSdk(prompt, taskId, systemPrompt, conversationDB, providedExecutor) {
    const executor = providedExecutor || new SdkExecutor({
        cwd: process.cwd(),
        systemPrompt: systemPrompt,
        maxTurns: 10
    });
    let output = '';
    let hasError = false;
    const streamParser = new StreamParser();
    const ruleVerifier = conversationDB ? new RuleVerifier(conversationDB) : null;
    // Stream handling for SDK messages
    executor.on('delta', async (event) => {
        if (event.type === 'data' && event.payload) {
            const messageStr = JSON.stringify(event.payload);
            output += messageStr + '\n';
            // Parse SDK events
            const events = streamParser.parse(messageStr);
            // Store in database
            if (conversationDB) {
                conversationDB.createStream({
                    id: uuidv4(),
                    conversation_id: taskId,
                    chunk: messageStr,
                    parsed_data: events.length > 0 ? { events } : undefined,
                    timestamp: new Date().toISOString(),
                }).catch(err => console.error('[SDK] Stream storage error:', err));
                for (const evt of events) {
                    if (evt.type !== 'output_chunk') {
                        conversationDB.createAction({
                            id: uuidv4(),
                            conversation_id: taskId,
                            timestamp: evt.timestamp,
                            type: evt.type,
                            content: evt.content,
                            metadata: evt.metadata,
                        }).catch(err => console.error('[SDK] Action storage error:', err));
                    }
                }
            }
        }
    });
    executor.on('assistant_message', (event) => {
        console.error(`[SDK] Assistant message received`);
        // Process tool calls from assistant messages
        if (event.payload && conversationDB) {
            conversationDB.createAction({
                id: uuidv4(),
                conversation_id: taskId,
                timestamp: new Date().toISOString(),
                type: 'output',
                content: JSON.stringify(event.payload),
                metadata: { source: 'sdk', messageType: 'assistant' }
            }).catch(err => console.error('[SDK] Assistant message storage error:', err));
        }
    });
    executor.on('error', (event) => {
        hasError = true;
        console.error(`[SDK ERROR] ${event.payload}`);
        if (conversationDB) {
            conversationDB.createAction({
                id: uuidv4(),
                conversation_id: taskId,
                timestamp: new Date().toISOString(),
                type: 'error',
                content: event.payload,
                metadata: { errorType: 'sdk_error' }
            }).catch(err => console.error('[SDK] Error storage failed:', err));
        }
    });
    executor.on('complete', (event) => {
        console.error(`[SDK] Execution complete. Messages: ${event.payload?.messageCount}`);
    });
    console.error(`[SDK] Executing task ${taskId} with SDK executor`);
    try {
        await executor.execute(prompt, taskId);
        if (hasError) {
            throw new Error('SDK execution failed with errors');
        }
        // Get final response
        const finalResponse = executor.getFinalResponse();
        return finalResponse || output;
    }
    catch (error) {
        console.error(`[SDK] Execution error:`, error);
        throw error;
    }
}
// Helper to determine if task needs interactive execution
function needsInteractiveExecution(prompt) {
    // Tasks that typically need user interaction or permissions
    const interactivePatterns = [
        /\b(install|npm install|yarn|pip install|apt-get|brew)\b/i,
        /\b(permission|sudo|admin|authorize)\b/i,
        /\b(login|authenticate|credentials)\b/i,
        /\b(interactive|dialog|prompt for)\b/i,
        /\b(server|start server|run server|localhost)\b/i,
    ];
    return interactivePatterns.some(pattern => pattern.test(prompt));
}
export async function handleAxiomMcpSpawn(input, statusManager, conversationDB) {
    try {
        // Get temporal context
        const startDate = execSync('date', { encoding: 'utf-8' }).trim();
        console.error(`[TEMPORAL] Spawn start: ${startDate}`);
        console.error(`[VERSION] Axiom MCP ${AXIOM_VERSION}`);
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
        // Execute the spawning prompt with appropriate executor
        const useInteractive = needsInteractiveExecution(spawnPrompt);
        console.error(`[SPAWN] Executing parent task with ${useInteractive ? 'PTY' : 'SDK'} to generate ${input.spawnCount} subtasks...`);
        const spawnResult = useInteractive
            ? await executeWithPty(spawnPrompt, rootTaskId, systemPrompt, conversationDB)
            : await executeWithSdk(spawnPrompt + (systemPrompt ? `\n\nSystem: ${systemPrompt}` : ''), rootTaskId, systemPrompt, conversationDB);
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
        // Check if verbose mode is requested but no subtasks
        if (input.verboseMasterMode && subtasks.length === 0) {
            console.error(chalk.yellow('\n[VERBOSE MODE] No subtasks generated. Parent task completed with file creation.'));
            return {
                content: [{
                        type: 'text',
                        text: `✅ Task completed successfully in verbose mode!\n\nCreated ${newFiles.length} files:\n${newFiles.map(f => `- ${f}`).join('\n')}\n\nNo subtasks were generated, but the implementation is complete.`
                    }]
            };
        }
        // Check if verbose mode is requested
        if (input.verboseMasterMode && subtasks.length > 0) {
            console.error('[DEBUG] Entering verbose mode with', subtasks.length, 'subtasks');
            console.error(chalk.cyan('\n' + '━'.repeat(60)));
            console.error(chalk.cyan.bold('    VERBOSE MASTER MODE - PARALLEL EXECUTION'));
            console.error(chalk.cyan('━'.repeat(60)));
            console.error(chalk.gray(`Parent: ${input.parentPrompt}`));
            console.error(chalk.gray(`Pattern: ${input.spawnPattern} | Children: ${subtasks.length}`));
            console.error(chalk.cyan('━'.repeat(60) + '\n'));
            // Create the stream aggregator
            const aggregator = new StreamAggregator(conversationDB ? new StreamParser() : null, conversationDB ? new RuleVerifier(conversationDB) : null, conversationDB, process.stderr);
            // Track completion
            let completedCount = 0;
            const startTime = Date.now();
            aggregator.on('child-complete', ({ taskId, duration }) => {
                completedCount++;
                console.error(chalk.gray(`\n[MASTER] Progress: ${completedCount}/${subtasks.length} tasks completed`));
                if (completedCount === subtasks.length) {
                    const totalDuration = Date.now() - startTime;
                    console.error(chalk.green(`\n[MASTER] All tasks completed in ${(totalDuration / 1000).toFixed(1)}s\n`));
                }
            });
            aggregator.on('intervention', ({ taskId, line }) => {
                console.error(chalk.yellow(`\n⚡ Intervention detected in ${taskId.slice(0, 8)}\n`));
            });
            // Create multi-progress bar
            const multibar = new cliProgress.MultiBar({
                format: '{taskId} |{bar}| {percentage}% | {lines} lines | {interventions} interventions',
                clearOnComplete: false,
                hideCursor: true,
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591'
            }, cliProgress.Presets.shades_classic);
            // Map to track progress bars
            const progressBars = new Map();
            // Execute all children with streaming
            const childTaskIds = [];
            const childPromises = subtasks.map(async (subtask, index) => {
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
                        metadata: { index }
                    });
                }
                // Create progress bar for this child
                const bar = multibar.create(100, 0, {
                    taskId: childId.slice(0, 8),
                    lines: 0,
                    interventions: 0
                });
                progressBars.set(childId, bar);
                // Update progress on aggregator events
                const updateProgress = (event) => {
                    if (event.taskId === childId) {
                        const progress = Math.min((event.lines / 50) * 100, 90); // Estimate progress
                        bar.update(progress, {
                            lines: event.lines,
                            interventions: event.interventions || 0
                        });
                    }
                };
                aggregator.on('stats', updateProgress);
                // Determine executor type
                const childPrompt = `CRITICAL: You must implement actual code, not just describe it.\n\n${subtask}`;
                const useChildInteractive = needsInteractiveExecution(childPrompt);
                try {
                    // Create executor but don't await yet
                    let executorPromise;
                    if (useChildInteractive) {
                        // Create PTY executor  
                        const executor = new PtyExecutor({
                            cwd: process.cwd(),
                            enableMonitoring: true,
                            enableIntervention: true,
                        });
                        // Attach to aggregator BEFORE execution
                        aggregator.attachChild(childId, executor);
                        // Now execute with the same executor
                        executorPromise = executeWithPty(childPrompt, childId, systemPrompt, conversationDB, executor);
                    }
                    else {
                        // Create SDK executor
                        const executor = new SdkExecutor({
                            cwd: process.cwd(),
                            systemPrompt: systemPrompt,
                            maxTurns: 10
                        });
                        // Attach to aggregator
                        aggregator.attachChild(childId, executor);
                        // Execute with the same executor
                        executorPromise = executeWithSdk(childPrompt, childId, systemPrompt, conversationDB, executor);
                    }
                    // Handle completion asynchronously
                    executorPromise
                        .then(output => {
                        bar.update(100, { status: 'completed' });
                        statusManager.updateTask(childId, {
                            status: 'completed',
                            output: output,
                            temporalEndTime: execSync('date', { encoding: 'utf-8' }).trim(),
                        });
                        if (conversationDB) {
                            conversationDB.updateConversationStatus(childId, 'completed')
                                .catch(err => console.error(`[DB] Status update failed:`, err));
                        }
                    })
                        .catch(error => {
                        bar.update(100, { status: 'failed' });
                        console.error(chalk.red(`\n[${childId.slice(0, 8)}] Failed: ${error.message}\n`));
                        statusManager.updateTask(childId, {
                            status: 'failed',
                            error: error.message,
                            temporalEndTime: execSync('date', { encoding: 'utf-8' }).trim(),
                        });
                        if (conversationDB) {
                            conversationDB.updateConversationStatus(childId, 'failed')
                                .catch(err => console.error(`[DB] Status update failed:`, err));
                        }
                    });
                    // Return the promise for optional waiting
                    return executorPromise;
                }
                catch (error) {
                    console.error(chalk.red(`\n[${childId.slice(0, 8)}] Setup failed: ${error}\n`));
                    throw error;
                }
            });
            // Return immediately with streaming info
            rootTask.childTasks = childTaskIds;
            statusManager.updateTask(rootTaskId, {
                status: 'completed',
                childTasks: childTaskIds,
                temporalEndTime: execSync('date', { encoding: 'utf-8' }).trim(),
            });
            return {
                content: [{
                        type: 'text',
                        text: `🚀 **Verbose Master Mode Active!**

**Parent task completed successfully:**
- Created ${newFiles.length} files
- Generated ${subtasks.length} subtasks

**Now executing in parallel:**
${subtasks.map((task, i) => `${i + 1}. [${childTaskIds[i]?.slice(0, 8) || 'pending'}] ${task.slice(0, 60)}...`).join('\n')}

**Real-time output streaming to console with task prefixes.**

You'll see:
- \`[taskId]\` prefixed output from each child
- \`[INTERVENTION]\` messages when violations detected
- Progress bars showing execution status
- Completion notifications as tasks finish

**Continue working while tasks execute in background.**

To check status later:
\`\`\`
axiom_mcp_observe({ mode: "recent", limit: 20 })
\`\`\`

To see the conversation tree:
\`\`\`
axiom_mcp_observe({ 
  mode: "tree", 
  conversationId: "${rootTaskId}" 
})
\`\`\``
                    }]
            };
        }
        // Original non-verbose mode code
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
                const childPrompt = `CRITICAL: You must implement actual code, not just describe.\n\n${subtask}`;
                const useChildInteractive = needsInteractiveExecution(childPrompt);
                const childPromise = (useChildInteractive
                    ? executeWithPty(childPrompt, childId, systemPrompt, conversationDB)
                    : executeWithSdk(childPrompt + (systemPrompt ? `\n\nSystem: ${systemPrompt}` : ''), childId, systemPrompt, conversationDB)).then(output => {
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
        output += `- Subtasks Executed: ${childPromises.length}\n`;
        output += `- Total Interventions: ${interventionStats.totalInterventions}\n`;
        if (interventionStats.planningTimeouts > 0) {
            output += `  - Planning Timeouts: ${interventionStats.planningTimeouts}\n`;
        }
        if (interventionStats.todoViolations > 0) {
            output += `  - TODO Violations: ${interventionStats.todoViolations}\n`;
        }
        if (interventionStats.progressChecks > 0) {
            output += `  - Progress Checks: ${interventionStats.progressChecks}\n`;
        }
        output += '\n';
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
        // MCP SDK expects this exact format for tool responses
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