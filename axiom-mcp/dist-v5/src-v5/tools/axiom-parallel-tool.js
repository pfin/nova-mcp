/**
 * Axiom v5 - Parallel Execution MCP Tool
 * Exposes parallel execution capabilities through MCP
 */
import { ParallelExecutor, TaskDecomposer } from '../index.js';
import { z } from 'zod';
// Tool schemas
const ParallelSpawnSchema = z.object({
    prompt: z.string().describe('Main task to decompose and execute in parallel'),
    strategy: z.enum(['orthogonal', 'dependency']).default('orthogonal').describe('Decomposition strategy'),
    maxInstances: z.number().default(5).describe('Maximum parallel Claude instances'),
    aggressiveKilling: z.boolean().default(true).describe('Enable aggressive killing of unproductive instances')
});
const ParallelStatusSchema = z.object({
    executorId: z.string().optional().describe('Specific executor to check (omit for all)')
});
const ParallelKillSchema = z.object({
    executorId: z.string().describe('Executor ID to shutdown'),
    instanceId: z.string().optional().describe('Specific instance to kill (omit to kill all)')
});
// Global executors map
const executors = new Map();
/**
 * Axiom Parallel Spawn Tool
 * Decomposes and executes tasks in parallel
 */
export const axiomParallelSpawnTool = {
    name: 'axiom_parallel_spawn',
    description: 'Decompose and execute a complex task in parallel across multiple Claude instances',
    inputSchema: ParallelSpawnSchema,
    async execute(args) {
        const executorId = `parallel-${Date.now()}`;
        // Decompose the task
        const tasks = TaskDecomposer.decompose(args.prompt, args.strategy);
        // For demo, let's create 3 orthogonal tasks manually
        if (tasks.length === 1 && args.strategy === 'orthogonal') {
            // Example decomposition for a web app task
            const basePrompt = args.prompt;
            tasks.length = 0;
            tasks.push({
                id: 'backend-api',
                prompt: `Create the backend API for: ${basePrompt}. Focus ONLY on server-side code, routes, and data models. Create files in /backend directory.`,
                priority: 1,
                status: 'pending',
                outputLines: 0,
                lastActivity: Date.now(),
                filesCreated: []
            });
            tasks.push({
                id: 'frontend-ui',
                prompt: `Create the frontend UI for: ${basePrompt}. Focus ONLY on React/HTML/CSS components. Create files in /frontend directory.`,
                priority: 1,
                status: 'pending',
                outputLines: 0,
                lastActivity: Date.now(),
                filesCreated: []
            });
            tasks.push({
                id: 'database-schema',
                prompt: `Create the database schema and migrations for: ${basePrompt}. Focus ONLY on SQL schema, indexes, and sample data. Create files in /database directory.`,
                priority: 1,
                status: 'pending',
                outputLines: 0,
                lastActivity: Date.now(),
                filesCreated: []
            });
        }
        // Create executor
        const executor = new ParallelExecutor({
            maxInstances: args.maxInstances,
            workspaceRoot: `/tmp/axiom-parallel/${executorId}`,
            enableAggressiveKilling: args.aggressiveKilling,
            killIdleAfterMs: 30000,
            killUnproductiveAfterMs: 90000,
            minProductivityScore: 15
        });
        executors.set(executorId, executor);
        // Start execution (non-blocking)
        executor.execute(tasks).then(results => {
            console.log(`[PARALLEL] Execution ${executorId} completed with ${results.size} results`);
        }).catch(error => {
            console.error(`[PARALLEL] Execution ${executorId} failed:`, error);
        });
        return {
            executorId,
            status: 'started',
            taskCount: tasks.length,
            tasks: tasks.map(t => ({
                id: t.id,
                prompt: t.prompt.slice(0, 100) + '...',
                priority: t.priority
            })),
            message: 'Parallel execution started. Use axiom_parallel_status to monitor progress.'
        };
    }
};
/**
 * Axiom Parallel Status Tool
 * Check status of parallel executions
 */
export const axiomParallelStatusTool = {
    name: 'axiom_parallel_status',
    description: 'Get status of parallel executions',
    inputSchema: ParallelStatusSchema,
    async execute(args) {
        if (args.executorId) {
            const executor = executors.get(args.executorId);
            if (!executor) {
                throw new Error(`No executor found with ID: ${args.executorId}`);
            }
            return {
                executorId: args.executorId,
                ...executor.getStatus()
            };
        }
        // Return all executors
        const allStatus = [];
        for (const [id, executor] of executors) {
            allStatus.push({
                executorId: id,
                ...executor.getStatus()
            });
        }
        return { executors: allStatus };
    }
};
/**
 * Axiom Parallel Kill Tool
 * Shutdown parallel executions
 */
export const axiomParallelKillTool = {
    name: 'axiom_parallel_kill',
    description: 'Kill parallel execution or specific instance',
    inputSchema: ParallelKillSchema,
    async execute(args) {
        const executor = executors.get(args.executorId);
        if (!executor) {
            throw new Error(`No executor found with ID: ${args.executorId}`);
        }
        if (args.instanceId) {
            // Kill specific instance
            const success = executor.interruptInstance(args.instanceId);
            return {
                executorId: args.executorId,
                instanceId: args.instanceId,
                action: 'interrupted',
                success
            };
        }
        // Shutdown entire executor
        await executor.shutdown();
        executors.delete(args.executorId);
        return {
            executorId: args.executorId,
            action: 'shutdown',
            message: 'All instances killed and workspace cleaned'
        };
    }
};
/**
 * Register all parallel tools with MCP server
 */
export function registerParallelTools(server) {
    server.setRequestHandler('axiom_parallel_spawn', axiomParallelSpawnTool);
    server.setRequestHandler('axiom_parallel_status', axiomParallelStatusTool);
    server.setRequestHandler('axiom_parallel_kill', axiomParallelKillTool);
}
//# sourceMappingURL=axiom-parallel-tool.js.map