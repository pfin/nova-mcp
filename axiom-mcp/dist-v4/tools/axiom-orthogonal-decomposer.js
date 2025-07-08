import { z } from 'zod';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { logDebug } from '../core/simple-logger.js';
// Schema for orthogonal task decomposition
export const orthogonalDecomposerSchema = z.object({
    action: z.enum(['decompose', 'execute', 'status', 'merge']),
    prompt: z.string().optional(),
    taskIds: z.array(z.string()).optional(),
    strategy: z.enum(['orthogonal', 'mcts', 'hybrid']).default('orthogonal')
});
export class OrthogonalDecomposer extends EventEmitter {
    executions = new Map();
    maxParallel = 10;
    taskTimeout = 5 * 60 * 1000; // 5 minutes
    async decompose(mainPrompt) {
        logDebug('DECOMPOSER', `Decomposing: ${mainPrompt.substring(0, 50)}...`);
        // For now, use a heuristic decomposition
        // In production, this would call Claude to intelligently decompose
        const tasks = this.heuristicDecompose(mainPrompt);
        logDebug('DECOMPOSER', `Decomposed into ${tasks.length} orthogonal tasks`);
        return tasks;
    }
    heuristicDecompose(prompt) {
        // Simple pattern matching for common tasks
        const tasks = [];
        if (prompt.toLowerCase().includes('api') || prompt.toLowerCase().includes('rest')) {
            tasks.push({
                id: 'models',
                prompt: 'Create data models in models/ directory. Focus on schema only, no dependencies.',
                duration: 5,
                outputs: ['models/index.js']
            }, {
                id: 'routes',
                prompt: 'Create route handlers in routes/ directory. Use mock data, no database.',
                duration: 5,
                outputs: ['routes/index.js']
            }, {
                id: 'middleware',
                prompt: 'Create middleware in middleware/ directory. Auth and error handling.',
                duration: 5,
                outputs: ['middleware/auth.js', 'middleware/error.js']
            }, {
                id: 'tests',
                prompt: 'Create tests in tests/ directory. Unit tests only, mock everything.',
                duration: 5,
                outputs: ['tests/api.test.js']
            }, {
                id: 'config',
                prompt: 'Create configuration in config/index.js. Environment variables.',
                duration: 5,
                outputs: ['config/index.js']
            });
        }
        else if (prompt.toLowerCase().includes('cache') || prompt.toLowerCase().includes('lru')) {
            tasks.push({
                id: 'cache-core',
                prompt: 'Create core cache logic in cache.js. Basic get/set operations.',
                duration: 5,
                outputs: ['cache.js']
            }, {
                id: 'lru-logic',
                prompt: 'Create LRU eviction logic in lru.js. Standalone algorithm.',
                duration: 5,
                outputs: ['lru.js']
            }, {
                id: 'ttl-handler',
                prompt: 'Create TTL handling in ttl.js. Time-based expiration.',
                duration: 5,
                outputs: ['ttl.js']
            }, {
                id: 'tests',
                prompt: 'Create comprehensive tests in tests/. Test each component.',
                duration: 5,
                outputs: ['tests/cache.test.js']
            });
        }
        else {
            // Generic decomposition
            tasks.push({
                id: 'implementation',
                prompt: `${prompt} - Focus on core implementation only.`,
                duration: 5,
                outputs: ['index.js']
            });
        }
        // Add reserve tasks for integration
        tasks.push({
            id: 'integration',
            prompt: 'Integrate all components. Connect and test together.',
            duration: 5,
            outputs: ['app.js'],
            dependencies: tasks.map(t => t.id),
            trigger: 'after-orthogonal'
        });
        return tasks;
    }
    async execute(tasks) {
        logDebug('DECOMPOSER', `Executing ${tasks.length} tasks in parallel`);
        // Separate orthogonal and reserve tasks
        const orthogonal = tasks.filter(t => !t.dependencies);
        const reserves = tasks.filter(t => t.dependencies);
        // Execute orthogonal tasks in parallel
        const orthogonalResults = await this.executeParallel(orthogonal);
        // Check for failures and roadblocks
        const failures = Array.from(orthogonalResults.values())
            .filter(r => r.status === 'failed' || r.status === 'timeout');
        if (failures.length > 0) {
            logDebug('DECOMPOSER', `${failures.length} tasks failed, activating reserves`);
            // Execute appropriate reserve tasks
            const reserveResults = await this.executeReserves(reserves, failures);
            // Merge results
            for (const [id, result] of reserveResults) {
                orthogonalResults.set(id, result);
            }
        }
        return orthogonalResults;
    }
    async executeParallel(tasks) {
        const results = new Map();
        // Create executions
        for (const task of tasks) {
            const workspace = await fs.mkdtemp(path.join(os.tmpdir(), `axiom-${task.id}-`));
            const execution = {
                task,
                status: 'pending',
                workspace,
                startTime: 0,
                output: [],
                files: new Map()
            };
            this.executions.set(task.id, execution);
            results.set(task.id, execution);
        }
        // Start all tasks
        const promises = tasks.map(task => this.executeSingleTask(task.id));
        // Monitor for timeouts
        const monitor = setInterval(() => {
            for (const [id, exec] of this.executions) {
                if (exec.status === 'running') {
                    const elapsed = Date.now() - exec.startTime;
                    if (elapsed > this.taskTimeout) {
                        logDebug('DECOMPOSER', `Task ${id} timeout, interrupting`);
                        if (exec.claude) {
                            exec.claude.write('\x1b'); // ESC to interrupt
                            exec.claude.kill();
                        }
                        exec.status = 'timeout';
                        this.emit('timeout', id);
                    }
                }
            }
        }, 10000); // Check every 10 seconds
        // Wait for all tasks
        await Promise.allSettled(promises);
        clearInterval(monitor);
        return results;
    }
    async executeSingleTask(taskId) {
        const execution = this.executions.get(taskId);
        if (!execution)
            return;
        try {
            execution.status = 'running';
            execution.startTime = Date.now();
            logDebug('DECOMPOSER', `Starting task ${taskId} in ${execution.workspace}`);
            // Copy base files to workspace
            await this.setupWorkspace(execution.workspace);
            // Spawn Claude
            const claude = pty.spawn('claude', [], {
                name: 'xterm-color',
                cols: 80,
                rows: 30,
                cwd: execution.workspace,
                env: process.env
            });
            execution.claude = claude;
            // Monitor output
            claude.onData((data) => {
                execution.output.push(data);
                // Detect completion patterns
                if (data.includes('task complete') ||
                    data.includes('finished') ||
                    execution.output.join('').includes('```')) {
                    // Give a bit more time for final output
                    setTimeout(() => {
                        if (execution.status === 'running') {
                            execution.status = 'complete';
                            claude.kill();
                        }
                    }, 5000);
                }
            });
            // Wait for ready state
            await this.waitForReady(claude, execution);
            // Send task prompt
            await this.sendPrompt(claude, execution.task.prompt);
            // Wait for completion or timeout
            await new Promise((resolve) => {
                claude.onExit(() => {
                    resolve();
                });
                // Also resolve on status change
                const checkStatus = setInterval(() => {
                    if (execution.status !== 'running') {
                        clearInterval(checkStatus);
                        resolve();
                    }
                }, 1000);
            });
            // Collect created files
            execution.files = await this.collectFiles(execution.workspace, execution.task.outputs);
            // Verify success
            if (execution.task.outputs.every(file => execution.files.has(file))) {
                execution.status = 'complete';
                logDebug('DECOMPOSER', `Task ${taskId} completed successfully`);
            }
            else {
                execution.status = 'failed';
                logDebug('DECOMPOSER', `Task ${taskId} failed - missing outputs`);
            }
        }
        catch (error) {
            execution.status = 'failed';
            logDebug('DECOMPOSER', `Task ${taskId} error: ${error.message}`);
        }
    }
    async setupWorkspace(workspace) {
        // Create basic structure
        await fs.mkdir(path.join(workspace, 'models'), { recursive: true });
        await fs.mkdir(path.join(workspace, 'routes'), { recursive: true });
        await fs.mkdir(path.join(workspace, 'tests'), { recursive: true });
        await fs.mkdir(path.join(workspace, 'config'), { recursive: true });
        // Add package.json
        await fs.writeFile(path.join(workspace, 'package.json'), JSON.stringify({
            name: 'axiom-task',
            version: '1.0.0',
            type: 'module'
        }, null, 2));
    }
    async waitForReady(claude, execution) {
        return new Promise((resolve) => {
            const checkReady = () => {
                const output = execution.output.join('');
                if (output.includes('Type your prompt') || output.includes('>')) {
                    resolve();
                }
                else {
                    setTimeout(checkReady, 500);
                }
            };
            checkReady();
        });
    }
    async sendPrompt(claude, prompt) {
        // Type slowly to mimic human
        for (const char of prompt) {
            claude.write(char);
            await new Promise(r => setTimeout(r, 50));
        }
        // Submit with Ctrl+Enter
        claude.write('\x0d');
    }
    async collectFiles(workspace, expectedFiles) {
        const files = new Map();
        for (const file of expectedFiles) {
            try {
                const content = await fs.readFile(path.join(workspace, file), 'utf-8');
                files.set(file, content);
            }
            catch (error) {
                // File doesn't exist
            }
        }
        return files;
    }
    async executeReserves(reserves, failures) {
        const results = new Map();
        // Find applicable reserves
        for (const reserve of reserves) {
            const shouldExecute = reserve.trigger === 'after-orthogonal' ||
                (reserve.trigger === 'roadblock' && failures.length > 0);
            if (shouldExecute) {
                logDebug('DECOMPOSER', `Executing reserve task: ${reserve.id}`);
                // Execute reserve task
                const workspace = await fs.mkdtemp(path.join(os.tmpdir(), `axiom-${reserve.id}-`));
                // Copy successful outputs to reserve workspace
                for (const [id, exec] of this.executions) {
                    if (exec.status === 'complete') {
                        for (const [file, content] of exec.files) {
                            const filePath = path.join(workspace, file);
                            await fs.mkdir(path.dirname(filePath), { recursive: true });
                            await fs.writeFile(filePath, content);
                        }
                    }
                }
                // Execute reserve
                this.executions.set(reserve.id, {
                    task: reserve,
                    status: 'pending',
                    workspace,
                    startTime: 0,
                    output: [],
                    files: new Map()
                });
                await this.executeSingleTask(reserve.id);
                const result = this.executions.get(reserve.id);
                results.set(reserve.id, result);
            }
        }
        return results;
    }
    async merge(executions) {
        logDebug('DECOMPOSER', 'Merging results using MCTS strategy');
        const merged = new Map();
        const scores = new Map();
        // Score each execution
        for (const [id, exec] of executions) {
            if (exec.status === 'complete') {
                scores.set(id, this.scoreExecution(exec));
            }
        }
        // For each expected file, pick best implementation
        const allFiles = new Set();
        for (const exec of executions.values()) {
            for (const file of exec.files.keys()) {
                allFiles.add(file);
            }
        }
        for (const file of allFiles) {
            let bestScore = -1;
            let bestContent = '';
            let bestSource = '';
            for (const [id, exec] of executions) {
                if (exec.files.has(file)) {
                    const score = scores.get(id) || 0;
                    if (score > bestScore) {
                        bestScore = score;
                        bestContent = exec.files.get(file);
                        bestSource = id;
                    }
                }
            }
            if (bestContent) {
                merged.set(file, bestContent);
                logDebug('DECOMPOSER', `Selected ${file} from ${bestSource} (score: ${bestScore})`);
            }
        }
        return merged;
    }
    scoreExecution(exec) {
        let score = 0;
        // Completed successfully
        if (exec.status === 'complete')
            score += 0.5;
        // Created expected files
        const expectedCount = exec.task.outputs.length;
        const createdCount = exec.task.outputs.filter(f => exec.files.has(f)).length;
        score += (createdCount / expectedCount) * 0.3;
        // Code quality heuristics
        for (const [file, content] of exec.files) {
            if (content.includes('test'))
                score += 0.05;
            if (content.includes('error'))
                score += 0.05;
            if (content.includes('TODO'))
                score -= 0.1;
            if (content.includes('async'))
                score += 0.05;
        }
        return Math.max(0, Math.min(1, score));
    }
}
// Global instance
let decomposer = null;
export async function axiomOrthogonalDecompose(params) {
    if (!decomposer) {
        decomposer = new OrthogonalDecomposer();
    }
    const { action, prompt, taskIds, strategy } = params;
    switch (action) {
        case 'decompose':
            if (!prompt)
                throw new Error('Prompt required for decompose action');
            const tasks = await decomposer.decompose(prompt);
            return JSON.stringify({ tasks }, null, 2);
        case 'execute':
            if (!prompt)
                throw new Error('Prompt required for execute action');
            // Decompose and execute
            const decomposed = await decomposer.decompose(prompt);
            const results = await decomposer.execute(decomposed);
            // Convert to serializable format
            const summary = Array.from(results.entries()).map(([id, exec]) => ({
                id,
                status: exec.status,
                outputs: Array.from(exec.files.keys()),
                duration: exec.startTime ? Date.now() - exec.startTime : 0
            }));
            return JSON.stringify({
                totalTasks: decomposed.length,
                completed: summary.filter(s => s.status === 'complete').length,
                failed: summary.filter(s => s.status === 'failed').length,
                tasks: summary
            }, null, 2);
        case 'merge':
            // Get latest executions and merge
            const executions = decomposer['executions']; // Access private for now
            const merged = await decomposer.merge(executions);
            return JSON.stringify({
                mergedFiles: Array.from(merged.keys()),
                totalSize: Array.from(merged.values()).reduce((sum, content) => sum + content.length, 0)
            }, null, 2);
        case 'status':
            const status = Array.from(decomposer['executions'].entries()).map(([id, exec]) => ({
                id,
                status: exec.status,
                duration: exec.startTime ? Date.now() - exec.startTime : 0,
                outputSize: exec.output.length
            }));
            return JSON.stringify({ tasks: status }, null, 2);
        default:
            throw new Error(`Unknown action: ${action}`);
    }
}
//# sourceMappingURL=axiom-orthogonal-decomposer.js.map