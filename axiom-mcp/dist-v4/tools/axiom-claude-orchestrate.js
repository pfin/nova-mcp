import { z } from 'zod';
import { spawn } from 'node-pty';
import { EventEmitter } from 'events';
import { logDebug } from '../core/simple-logger.js';
// Schema for the MCP tool
export const axiomClaudeOrchestrateSchema = z.object({
    action: z.enum(['spawn', 'prompt', 'steer', 'get_output', 'status', 'cleanup']),
    instanceId: z.string(),
    prompt: z.string().optional(),
    lines: z.number().optional().default(20)
});
// Global orchestrator
class ClaudeOrchestrator extends EventEmitter {
    instances = new Map();
    MAX_INSTANCES = 10;
    INSTANCE_TIMEOUT = 300000; // 5 minutes
    constructor() {
        super();
        // Cleanup old instances periodically
        setInterval(() => this.cleanupStaleInstances(), 60000);
    }
    async spawn(instanceId) {
        if (this.instances.has(instanceId)) {
            throw new Error(`Instance ${instanceId} already exists`);
        }
        if (this.instances.size >= this.MAX_INSTANCES) {
            throw new Error(`Maximum instances (${this.MAX_INSTANCES}) reached`);
        }
        logDebug('CLAUDE_ORCHESTRATE', `Spawning Claude instance: ${instanceId}`);
        const pty = spawn('claude', [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.cwd(),
            env: process.env
        });
        const instance = {
            id: instanceId,
            pty,
            buffer: '',
            state: 'starting',
            createdAt: new Date(),
            lastActivity: new Date()
        };
        // Data handler
        pty.onData((data) => {
            instance.buffer += data;
            instance.lastActivity = new Date();
            // Detect ready state
            if (instance.state === 'starting' && (data.includes('>') || data.includes('?'))) {
                instance.state = 'ready';
                logDebug('CLAUDE_ORCHESTRATE', `Claude instance ${instanceId} is ready`);
                this.emit('ready', instanceId);
            }
            // Log significant events
            if (data.includes('```')) {
                logDebug('CLAUDE_ORCHESTRATE', `Code block detected in ${instanceId}`);
            }
        });
        pty.onExit(() => {
            logDebug('CLAUDE_ORCHESTRATE', `Claude instance ${instanceId} exited`);
            this.instances.delete(instanceId);
        });
        this.instances.set(instanceId, instance);
        // Wait for ready state
        await this.waitForReady(instanceId);
        return `Claude instance ${instanceId} spawned and ready`;
    }
    async prompt(instanceId, text) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`No instance ${instanceId}`);
        }
        if (instance.state !== 'ready') {
            throw new Error(`Instance ${instanceId} not ready (state: ${instance.state})`);
        }
        logDebug('CLAUDE_ORCHESTRATE', `Sending prompt to ${instanceId}: ${text.substring(0, 50)}...`);
        // Type slowly like a human
        await this.typeSlowly(instance.pty, text);
        // Submit
        await new Promise(r => setTimeout(r, 300));
        instance.pty.write('\x0d');
        instance.state = 'working';
        instance.lastActivity = new Date();
        return `Prompt sent to ${instanceId}`;
    }
    async steer(instanceId, newPrompt) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`No instance ${instanceId}`);
        }
        logDebug('CLAUDE_ORCHESTRATE', `Steering ${instanceId} to: ${newPrompt.substring(0, 50)}...`);
        // Send ESC to interrupt
        instance.pty.write('\x1b');
        await new Promise(r => setTimeout(r, 1000));
        // Send new prompt
        await this.typeSlowly(instance.pty, newPrompt);
        await new Promise(r => setTimeout(r, 300));
        instance.pty.write('\x0d');
        instance.state = 'working';
        instance.lastActivity = new Date();
        return `Instance ${instanceId} steered to new task`;
    }
    getOutput(instanceId, lines) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`No instance ${instanceId}`);
        }
        if (lines) {
            const allLines = instance.buffer.split('\n');
            return allLines.slice(-lines).join('\n');
        }
        return instance.buffer;
    }
    getStatus(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            return { exists: false };
        }
        return {
            exists: true,
            id: instance.id,
            state: instance.state,
            bufferSize: instance.buffer.length,
            createdAt: instance.createdAt.toISOString(),
            lastActivity: instance.lastActivity.toISOString(),
            uptime: Date.now() - instance.createdAt.getTime()
        };
    }
    cleanup(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            return `No instance ${instanceId} to cleanup`;
        }
        logDebug('CLAUDE_ORCHESTRATE', `Cleaning up Claude instance ${instanceId}`);
        instance.pty.kill();
        this.instances.delete(instanceId);
        return `Instance ${instanceId} cleaned up`;
    }
    async typeSlowly(pty, text) {
        for (const char of text) {
            pty.write(char);
            await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
        }
    }
    async waitForReady(instanceId, timeout = 30000) {
        const start = Date.now();
        return new Promise((resolve, reject) => {
            const check = () => {
                const instance = this.instances.get(instanceId);
                if (!instance) {
                    reject(new Error(`Instance ${instanceId} disappeared`));
                    return;
                }
                if (instance.state === 'ready') {
                    resolve();
                    return;
                }
                if (Date.now() - start > timeout) {
                    reject(new Error(`Instance ${instanceId} timeout waiting for ready`));
                    return;
                }
                setTimeout(check, 100);
            };
            check();
        });
    }
    cleanupStaleInstances() {
        const now = Date.now();
        for (const [id, instance] of this.instances) {
            if (now - instance.lastActivity.getTime() > this.INSTANCE_TIMEOUT) {
                logDebug('CLAUDE_ORCHESTRATE', `Cleaning up stale instance ${id}`);
                this.cleanup(id);
            }
        }
    }
    getAllInstances() {
        return Array.from(this.instances.keys());
    }
}
// Global orchestrator instance
const orchestrator = new ClaudeOrchestrator();
// MCP tool implementation
export async function axiomClaudeOrchestrate(params) {
    const { action, instanceId, prompt, lines } = params;
    logDebug('CLAUDE_ORCHESTRATE', `axiom_claude_orchestrate: ${action} on ${instanceId}`);
    switch (action) {
        case 'spawn':
            return await orchestrator.spawn(instanceId);
        case 'prompt':
            if (!prompt)
                throw new Error('Prompt required for prompt action');
            return await orchestrator.prompt(instanceId, prompt);
        case 'steer':
            if (!prompt)
                throw new Error('Prompt required for steer action');
            return await orchestrator.steer(instanceId, prompt);
        case 'get_output':
            return {
                instanceId,
                output: orchestrator.getOutput(instanceId, lines),
                truncated: lines !== undefined
            };
        case 'status':
            if (instanceId === '*') {
                // Get all instances
                return {
                    instances: orchestrator.getAllInstances().map(id => ({
                        id,
                        ...orchestrator.getStatus(id)
                    }))
                };
            }
            return orchestrator.getStatus(instanceId);
        case 'cleanup':
            return orchestrator.cleanup(instanceId);
        default:
            throw new Error(`Unknown action: ${action}`);
    }
}
//# sourceMappingURL=axiom-claude-orchestrate.js.map