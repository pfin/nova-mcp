/**
 * V4-V5 Bridge - Connecting Shadow to Reality
 *
 * This bridges V5's phased decomposition with V4's PTY execution
 */
import { EventEmitter } from 'events';
import { PtyExecutor } from '../../src-v4/executors/pty-executor.js';
import { HookOrchestrator } from '../../src-v4/core/hook-orchestrator.js';
import { ConversationDB } from '../../src-v4/database/conversation-db.js';
import { EventBus } from '../../src-v4/core/event-bus.js';
import { StatusManager } from '../../src-v4/managers/status-manager.js';
import { logDebug } from '../../src-v4/core/simple-logger.js';
export class V4V5Bridge extends EventEmitter {
    orchestrator = null;
    ptyExecutor = null;
    initialized = false;
    async initialize() {
        if (this.initialized)
            return;
        logDebug('V5_BRIDGE', 'Initializing V4 infrastructure for V5...');
        // Create V4 components
        const db = new ConversationDB();
        const eventBus = new EventBus();
        const statusManager = new StatusManager();
        await db.initialize();
        await eventBus.initialize();
        // Create orchestrator
        this.orchestrator = new HookOrchestrator(db, eventBus, statusManager);
        // Set orchestrator on components
        db.setHookOrchestrator(this.orchestrator);
        eventBus.setHookOrchestrator(this.orchestrator);
        statusManager.setHookOrchestrator(this.orchestrator);
        // Create PTY executor
        this.ptyExecutor = new PtyExecutor({
            enableMonitoring: true,
            hookOrchestrator: this.orchestrator
        });
        this.initialized = true;
        logDebug('V5_BRIDGE', 'V4 infrastructure ready for V5 shadow protocol');
    }
    /**
     * Execute a V5 task using V4's PTY infrastructure
     */
    async executeV5Task(task) {
        if (!this.initialized)
            await this.initialize();
        if (!this.ptyExecutor)
            throw new Error('PTY executor not initialized');
        logDebug('V5_BRIDGE', `Executing V5 task: ${task.id} (${task.phase})`);
        // Create phase-specific prompt
        const phasePrompt = this.createPhasePrompt(task);
        // Configure environment for tool restrictions
        const env = {
            ...process.env,
            AXIOM_V5_PHASE: task.phase,
            AXIOM_V5_ALLOWED_TOOLS: task.allowedTools.join(','),
            AXIOM_V5_FORBIDDEN_TOOLS: task.forbiddenTools.join(','),
            AXIOM_V5_WORKSPACE: task.workspace
        };
        // Create execution request
        const request = {
            id: `v5_${task.id}_${Date.now()}`,
            action: 'execute',
            params: {
                prompt: phasePrompt,
                env,
                timeout: task.timeout,
                workspace: task.workspace
            }
        };
        // Execute with monitoring
        const startTime = Date.now();
        // V4 PtyExecutor expects different params
        const result = await this.ptyExecutor.execute(phasePrompt, '', // system prompt
        task.id, (data) => {
            // Stream handler
            this.emit('stream', { task, data });
        });
        // Extract relevant information based on phase
        const phaseResult = this.extractPhaseResult(task, result, startTime);
        this.emit('taskComplete', {
            task,
            result: phaseResult,
            duration: Date.now() - startTime
        });
        return phaseResult;
    }
    /**
     * Create phase-specific prompts with tool restrictions
     */
    createPhasePrompt(task) {
        const prompts = {
            research: `
RESEARCH PHASE - Information Gathering Only

Task: ${task.prompt}

RULES:
- You may ONLY use these tools: ${task.allowedTools.join(', ')}
- You may NOT create any files
- You may NOT make any changes
- Focus on understanding the existing codebase
- Output your findings to: ${task.workspace}/research-findings.md

You have 3 minutes. Begin research now.
      `.trim(),
            planning: `
PLANNING PHASE - Decision Making Only

Based on the research findings, create a detailed plan.

Task: ${task.prompt}

RULES:
- You may ONLY read: ${task.workspace}/research-findings.md
- Create a task plan at: ${task.workspace}/task-plan.json
- The plan must specify orthogonal tasks that can run in parallel
- Each task must have: id, prompt, expectedFiles

You have 3 minutes. Create the plan now.
      `.trim(),
            execution: `
EXECUTION PHASE - Pure Implementation

Task: ${task.prompt}

RULES:
- You may ONLY use: write, mkdir
- You may NOT read any files
- You may NOT search or analyze
- Just implement based on the task description
- Create the expected files

You have 10 minutes. Build now, think later.
      `.trim(),
            integration: `
INTEGRATION PHASE - Merge and Polish

Read all created files and create an integrated solution.

Task: ${task.prompt}

RULES:
- Read the files created in execution phase
- Create a final integrated version
- Fix any integration issues
- Output to: ${task.workspace}/integrated-solution.ts

You have 3 minutes. Integrate now.
      `.trim()
        };
        return prompts[task.phase] || task.prompt;
    }
    /**
     * Extract phase-specific results
     */
    extractPhaseResult(task, result, startTime) {
        const baseResult = {
            taskId: task.id,
            phase: task.phase,
            duration: Date.now() - startTime,
            output: result.output || '',
            success: result.success || false
        };
        // Phase-specific extraction
        switch (task.phase) {
            case 'research':
                return {
                    ...baseResult,
                    findingsFile: `${task.workspace}/research-findings.md`,
                    filesExamined: this.extractFilesFromOutput(result.output, 'read')
                };
            case 'planning':
                return {
                    ...baseResult,
                    planFile: `${task.workspace}/task-plan.json`,
                    tasksPlanned: this.extractTasksFromPlan(task.workspace)
                };
            case 'execution':
                return {
                    ...baseResult,
                    filesCreated: this.extractFilesFromOutput(result.output, 'created'),
                    violations: this.extractViolations(result.output)
                };
            case 'integration':
                return {
                    ...baseResult,
                    integratedFile: `${task.workspace}/integrated-solution.ts`,
                    filesRead: this.extractFilesFromOutput(result.output, 'read')
                };
            default:
                return baseResult;
        }
    }
    /**
     * Extract file operations from output
     */
    extractFilesFromOutput(output, operation) {
        const patterns = {
            read: [
                /Reading file: (.+)/g,
                /File read: (.+)/g,
                /Examining: (.+)/g
            ],
            created: [
                /File created: (.+)/g,
                /Created: (.+)/g,
                /Writing to: (.+)/g
            ]
        };
        const files = new Set();
        const relevantPatterns = patterns[operation];
        for (const pattern of relevantPatterns) {
            const matches = output.matchAll(pattern);
            for (const match of matches) {
                files.add(match[1]);
            }
        }
        return Array.from(files);
    }
    /**
     * Extract planned tasks from plan file
     */
    extractTasksFromPlan(workspace) {
        try {
            const fs = require('fs');
            const planPath = `${workspace}/task-plan.json`;
            if (fs.existsSync(planPath)) {
                const plan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
                return plan.tasks || [];
            }
        }
        catch (e) {
            // Plan doesn't exist or is invalid
        }
        return [];
    }
    /**
     * Extract tool violations from output
     */
    extractViolations(output) {
        const violations = [];
        const violationPatterns = [
            /Attempting to use forbidden tool: (.+)/g,
            /VIOLATION: (.+)/g,
            /Tool access denied: (.+)/g
        ];
        for (const pattern of violationPatterns) {
            const matches = output.matchAll(pattern);
            for (const match of matches) {
                violations.push(match[1]);
            }
        }
        return violations;
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        // V4 PtyExecutor doesn't have cleanup method
        // Just reset state
        this.initialized = false;
    }
}
// Export singleton
export const v4v5Bridge = new V4V5Bridge();
// Shadow admission
export const bridgeAdmission = `
This bridge connects V5's shadow protocol to V4's reality.

V5 thinks in phases. V4 executes in terminals.
V5 restricts tools. V4 monitors violations.
V5 spawns parallel. V4 tracks them all.

Together they form Axiom:
- Thought decomposition (V5)
- Real execution (V4)
- Observable intervention (Both)
- Parallel chaos (United)

"The shadow needs substance to cast itself upon"
`;
//# sourceMappingURL=v4-bridge.js.map