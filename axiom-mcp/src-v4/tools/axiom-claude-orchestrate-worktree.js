import { z } from 'zod';
import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { simpleGit } from 'simple-git';
import { join, dirname } from 'path';
import { logDebug } from '../core/simple-logger.js';
// Schema for the MCP tool with worktree support
export const axiomClaudeOrchestrateWorktreeSchema = z.object({
    action: z.enum(['spawn', 'prompt', 'steer', 'get_output', 'status', 'cleanup']),
    instanceId: z.string(),
    prompt: z.string().optional(),
    lines: z.number().optional().default(20),
    useWorktree: z.boolean().optional().default(true),
    baseBranch: z.string().optional().default('main')
});
class WorktreeManager {
    mainRepo;
    git;
    worktrees = new Map();
    constructor(mainRepoPath) {
        this.mainRepo = mainRepoPath;
        this.git = simpleGit(mainRepoPath);
    }
    async createWorktree(instanceId, baseBranch) {
        const worktreePath = join(dirname(this.mainRepo), `axiom-${instanceId}`);
        const branchName = `axiom/${instanceId}/${Date.now()}`;
        try {
            // Create worktree with new branch from base branch
            await this.git.raw(['worktree', 'add', '-b', branchName, worktreePath, baseBranch]);
            this.worktrees.set(instanceId, {
                path: worktreePath,
                branch: branchName
            });
            logDebug('WORKTREE', `Created worktree for ${instanceId} at ${worktreePath}`);
            return worktreePath;
        }
        catch (error) {
            throw new Error(`Failed to create worktree: ${error.message}`);
        }
    }
    async removeWorktree(instanceId) {
        const worktree = this.worktrees.get(instanceId);
        if (!worktree)
            return;
        try {
            // Force remove to handle any uncommitted changes
            await this.git.raw(['worktree', 'remove', '--force', worktree.path]);
            this.worktrees.delete(instanceId);
            logDebug('WORKTREE', `Removed worktree for ${instanceId}`);
        }
        catch (error) {
            logDebug('WORKTREE', `Failed to remove worktree for ${instanceId}: ${error.message}`);
        }
    }
    async cleanup() {
        // Remove all managed worktrees
        for (const [id] of this.worktrees) {
            await this.removeWorktree(id);
        }
        // Prune any stale worktree metadata
        await this.git.raw(['worktree', 'prune']);
    }
}
export class ClaudeOrchestratorWithWorktrees extends EventEmitter {
    instances = new Map();
    maxInstances = 10;
    cleanupTimeout = 5 * 60 * 1000; // 5 minutes
    worktreeManager;
    constructor(mainRepoPath) {
        super();
        this.worktreeManager = new WorktreeManager(mainRepoPath || process.cwd());
    }
    async spawn(instanceId, useWorktree = true, baseBranch = 'main') {
        if (this.instances.has(instanceId)) {
            throw new Error(`Instance ${instanceId} already exists`);
        }
        if (this.instances.size >= this.maxInstances) {
            throw new Error(`Maximum instances (${this.maxInstances}) reached`);
        }
        let workingDir = process.cwd();
        let worktreePath;
        let git;
        // Create isolated worktree if requested
        if (useWorktree) {
            try {
                worktreePath = await this.worktreeManager.createWorktree(instanceId, baseBranch);
                workingDir = worktreePath;
                git = simpleGit(worktreePath);
            }
            catch (error) {
                logDebug('WORKTREE', `Failed to create worktree, falling back to main directory: ${error.message}`);
            }
        }
        logDebug('CLAUDE_ORCHESTRATE', `Spawning Claude instance: ${instanceId} in ${workingDir}`);
        const claudePty = pty.spawn('claude', [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: workingDir,
            env: process.env
        });
        const instance = {
            id: instanceId,
            pty: claudePty,
            output: [],
            state: 'starting',
            createdAt: new Date(),
            lastActivity: new Date(),
            worktreePath,
            branch: worktreePath ? `axiom/${instanceId}/${Date.now()}` : undefined,
            git
        };
        this.instances.set(instanceId, instance);
        // Set up output monitoring
        claudePty.onData((data) => {
            instance.output.push(data);
            instance.lastActivity = new Date();
            // Keep only last 10000 lines to prevent memory issues
            if (instance.output.length > 10000) {
                instance.output = instance.output.slice(-5000);
            }
            // Detect state changes
            if (instance.state === 'starting' && data.includes('Type your prompt')) {
                instance.state = 'ready';
                logDebug('CLAUDE_ORCHESTRATE', `Claude instance ${instanceId} is ready`);
                this.emit('ready', instanceId);
            }
            // Detect code blocks
            if (data.includes('```')) {
                logDebug('CLAUDE_ORCHESTRATE', `Code block detected in ${instanceId}`);
                this.emit('codeblock', instanceId, data);
            }
        });
        claudePty.onExit(() => {
            instance.state = 'complete';
            logDebug('CLAUDE_ORCHESTRATE', `Claude instance ${instanceId} exited`);
            this.emit('exit', instanceId);
            // Auto cleanup after timeout
            setTimeout(() => this.cleanup(instanceId), 60000);
        });
        // Set up auto-cleanup
        setTimeout(() => {
            if (this.instances.has(instanceId)) {
                this.cleanup(instanceId);
            }
        }, this.cleanupTimeout);
    }
    async sendPrompt(instanceId, text) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`Instance ${instanceId} not found`);
        }
        if (instance.state !== 'ready') {
            throw new Error(`Instance ${instanceId} is not ready (state: ${instance.state})`);
        }
        logDebug('CLAUDE_ORCHESTRATE', `Sending prompt to ${instanceId}: ${text.substring(0, 50)}...`);
        instance.state = 'working';
        // Type slowly like a human
        for (const char of text) {
            instance.pty.write(char);
            await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
        }
        // Submit with Ctrl+Enter
        instance.pty.write('\x0d');
    }
    async steer(instanceId, newPrompt) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`Instance ${instanceId} not found`);
        }
        logDebug('CLAUDE_ORCHESTRATE', `Steering ${instanceId} to: ${newPrompt.substring(0, 50)}...`);
        // Send ESC to interrupt
        instance.pty.write('\x1b');
        // Wait for interrupt to process
        await new Promise(r => setTimeout(r, 1000));
        // Send new prompt
        await this.sendPrompt(instanceId, newPrompt);
    }
    getOutput(instanceId, lines) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`Instance ${instanceId} not found`);
        }
        const output = instance.output.join('');
        if (!lines) {
            return output;
        }
        const outputLines = output.split('\n');
        return outputLines.slice(-lines).join('\n');
    }
    getStatus(instanceId) {
        if (instanceId === '*') {
            // Return all instances
            const instances = Array.from(this.instances.values()).map(inst => ({
                id: inst.id,
                state: inst.state,
                createdAt: inst.createdAt,
                lastActivity: inst.lastActivity,
                outputSize: inst.output.length,
                worktreePath: inst.worktreePath,
                branch: inst.branch
            }));
            return { instances };
        }
        const instance = this.instances.get(instanceId);
        if (!instance) {
            return { exists: false };
        }
        return {
            exists: true,
            state: instance.state,
            createdAt: instance.createdAt,
            lastActivity: instance.lastActivity,
            outputSize: instance.output.length,
            worktreePath: instance.worktreePath,
            branch: instance.branch
        };
    }
    async cleanup(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance)
            return;
        logDebug('CLAUDE_ORCHESTRATE', `Cleaning up Claude instance ${instanceId}`);
        try {
            instance.pty.kill();
        }
        catch (e) {
            // Already dead
        }
        // Remove worktree if it exists
        if (instance.worktreePath) {
            await this.worktreeManager.removeWorktree(instanceId);
        }
        this.instances.delete(instanceId);
    }
    async cleanupAll() {
        const ids = Array.from(this.instances.keys());
        for (const id of ids) {
            await this.cleanup(id);
        }
        // Final worktree cleanup
        await this.worktreeManager.cleanup();
    }
}
// Global orchestrator instance
let orchestrator = null;
export async function axiomClaudeOrchestrateWorktree(params) {
    // Initialize orchestrator if needed
    if (!orchestrator) {
        orchestrator = new ClaudeOrchestratorWithWorktrees();
        // Cleanup on process exit
        process.on('exit', () => {
            if (orchestrator) {
                orchestrator.cleanupAll().catch(console.error);
            }
        });
    }
    const { action, instanceId, prompt, lines, useWorktree, baseBranch } = params;
    logDebug('CLAUDE_ORCHESTRATE', `axiom_claude_orchestrate_worktree: ${action} on ${instanceId}`);
    switch (action) {
        case 'spawn':
            await orchestrator.spawn(instanceId, useWorktree, baseBranch);
            return `Claude instance ${instanceId} spawned${useWorktree ? ' with isolated worktree' : ''} and ready`;
        case 'prompt':
            if (!prompt)
                throw new Error('Prompt required for prompt action');
            await orchestrator.sendPrompt(instanceId, prompt);
            return `Prompt sent to ${instanceId}`;
        case 'steer':
            if (!prompt)
                throw new Error('Prompt required for steer action');
            await orchestrator.steer(instanceId, prompt);
            return `Instance ${instanceId} steered to new task`;
        case 'get_output':
            const output = orchestrator.getOutput(instanceId, lines);
            return JSON.stringify({ instanceId, output });
        case 'status':
            const status = orchestrator.getStatus(instanceId);
            return JSON.stringify(status);
        case 'cleanup':
            await orchestrator.cleanup(instanceId);
            return `Instance ${instanceId} cleaned up`;
        default:
            throw new Error(`Unknown action: ${action}`);
    }
}
//# sourceMappingURL=axiom-claude-orchestrate-worktree.js.map