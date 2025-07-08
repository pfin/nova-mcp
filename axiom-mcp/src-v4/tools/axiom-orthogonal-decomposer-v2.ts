import { z } from 'zod';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { logDebug } from '../core/simple-logger.js';

// Working Claude control sequences from our tests
const CLAUDE_CONTROLS = {
  SUBMIT: '\x0d',      // Ctrl+Enter (verified working)
  INTERRUPT: '\x1b',   // ESC
  BACKSPACE: '\x7f',
  UP_ARROW: '\x1b[A',
  DOWN_ARROW: '\x1b[B'
};

// Schema for orthogonal task decomposition
export const orthogonalDecomposerSchema = z.object({
  action: z.enum(['decompose', 'execute', 'status', 'merge']),
  prompt: z.string().optional(),
  taskIds: z.array(z.string()).optional(),
  strategy: z.enum(['orthogonal', 'mcts', 'hybrid']).default('orthogonal')
});

interface OrthogonalTask {
  id: string;
  prompt: string;
  duration: number; // minutes
  outputs: string[]; // expected file outputs
  dependencies?: string[]; // for non-orthogonal reserves
  trigger?: string; // when to activate reserves
}

interface TaskExecution {
  task: OrthogonalTask;
  status: 'pending' | 'running' | 'complete' | 'failed' | 'timeout';
  workspace: string;
  claude?: pty.IPty;
  startTime: number;
  output: string[];
  files: Map<string, string>;
  attempt: number;
}

interface CleanupTask {
  workspace: string;
  claude?: pty.IPty;
  intervals: NodeJS.Timeout[];
  timeouts: NodeJS.Timeout[];
}

export class OrthogonalDecomposerV2 extends EventEmitter {
  private executions: Map<string, TaskExecution> = new Map();
  private cleanupTasks: Map<string, CleanupTask> = new Map();
  private maxParallel = 10;
  private taskTimeout = 5 * 60 * 1000; // 5 minutes
  private maxRetries = 3;
  
  constructor() {
    super();
    
    // Register process cleanup handlers
    process.once('exit', () => this.cleanupAll());
    process.once('SIGINT', () => {
      this.cleanupAll();
      process.exit(0);
    });
    process.once('SIGTERM', () => {
      this.cleanupAll();
      process.exit(0);
    });
  }
  
  async decompose(mainPrompt: string): Promise<OrthogonalTask[]> {
    logDebug('DECOMPOSER_V2', `Decomposing: ${mainPrompt.substring(0, 50)}...`);
    
    // For v2, still use heuristic but with plan to upgrade
    const tasks = this.heuristicDecompose(mainPrompt);
    
    logDebug('DECOMPOSER_V2', `Decomposed into ${tasks.length} orthogonal tasks`);
    return tasks;
  }
  
  private heuristicDecompose(prompt: string): OrthogonalTask[] {
    // Same as v1 for now, but will be replaced with intelligent decomposition
    const tasks: OrthogonalTask[] = [];
    
    if (prompt.toLowerCase().includes('api') || prompt.toLowerCase().includes('rest')) {
      tasks.push(
        {
          id: 'models',
          prompt: 'Create data models in models/ directory. Focus on schema only, no dependencies.',
          duration: 5,
          outputs: ['models/index.js']
        },
        {
          id: 'routes',
          prompt: 'Create route handlers in routes/ directory. Use mock data, no database.',
          duration: 5,
          outputs: ['routes/index.js']
        },
        {
          id: 'middleware',
          prompt: 'Create middleware in middleware/ directory. Auth and error handling.',
          duration: 5,
          outputs: ['middleware/auth.js', 'middleware/error.js']
        },
        {
          id: 'tests',
          prompt: 'Create tests in tests/ directory. Unit tests only, mock everything.',
          duration: 5,
          outputs: ['tests/api.test.js']
        },
        {
          id: 'config',
          prompt: 'Create configuration in config/index.js. Environment variables.',
          duration: 5,
          outputs: ['config/index.js']
        }
      );
    } else {
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
  
  async execute(tasks: OrthogonalTask[]): Promise<Map<string, TaskExecution>> {
    logDebug('DECOMPOSER_V2', `Executing ${tasks.length} tasks in parallel`);
    
    try {
      // Separate orthogonal and reserve tasks
      const orthogonal = tasks.filter(t => !t.dependencies);
      const reserves = tasks.filter(t => t.dependencies);
      
      // Execute orthogonal tasks in parallel
      const orthogonalResults = await this.executeParallel(orthogonal);
      
      // Check for failures and roadblocks
      const failures = Array.from(orthogonalResults.values())
        .filter(r => r.status === 'failed' || r.status === 'timeout');
      
      if (failures.length > 0) {
        logDebug('DECOMPOSER_V2', `${failures.length} tasks failed, activating reserves`);
        
        // Execute appropriate reserve tasks
        const reserveResults = await this.executeReserves(reserves, failures);
        
        // Merge results
        for (const [id, result] of reserveResults) {
          orthogonalResults.set(id, result);
        }
      }
      
      return orthogonalResults;
    } finally {
      // Always cleanup
      await this.cleanupAll();
    }
  }
  
  private async executeParallel(tasks: OrthogonalTask[]): Promise<Map<string, TaskExecution>> {
    const results = new Map<string, TaskExecution>();
    
    // Create executions
    for (const task of tasks) {
      const workspace = await fs.mkdtemp(path.join(os.tmpdir(), `axiom-${task.id}-`));
      
      const execution: TaskExecution = {
        task,
        status: 'pending',
        workspace,
        startTime: 0,
        output: [],
        files: new Map(),
        attempt: 0
      };
      
      this.executions.set(task.id, execution);
      results.set(task.id, execution);
      
      // Register cleanup immediately
      this.registerCleanup(task.id, { workspace, intervals: [], timeouts: [] });
    }
    
    // Start all tasks
    const promises = tasks.map(task => this.executeSingleTask(task.id));
    
    // Monitor for timeouts
    const monitor = setInterval(() => {
      for (const [id, exec] of this.executions) {
        if (exec.status === 'running') {
          const elapsed = Date.now() - exec.startTime;
          
          if (elapsed > this.taskTimeout) {
            logDebug('DECOMPOSER_V2', `Task ${id} timeout, interrupting`);
            this.interruptTask(id);
          }
        }
      }
    }, 10000); // Check every 10 seconds
    
    // Track monitor for cleanup
    const cleanupTask = this.cleanupTasks.get('__monitor__') || { 
      workspace: '', 
      intervals: [], 
      timeouts: [] 
    };
    cleanupTask.intervals.push(monitor);
    this.cleanupTasks.set('__monitor__', cleanupTask);
    
    // Wait for all tasks
    await Promise.allSettled(promises);
    
    return results;
  }
  
  private async executeSingleTask(taskId: string): Promise<void> {
    const execution = this.executions.get(taskId);
    if (!execution) return;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      execution.attempt = attempt;
      
      try {
        await this.attemptExecution(taskId);
        
        if (execution.status === 'complete') {
          return; // Success
        }
      } catch (error: any) {
        logDebug('DECOMPOSER_V2', `Task ${taskId} attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === this.maxRetries) {
          execution.status = 'failed';
          return;
        }
        
        // Exponential backoff before retry
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  private async attemptExecution(taskId: string): Promise<void> {
    const execution = this.executions.get(taskId);
    if (!execution) return;
    
    let claude: pty.IPty | undefined;
    
    try {
      execution.status = 'running';
      execution.startTime = Date.now();
      execution.output = []; // Clear previous output
      
      logDebug('DECOMPOSER_V2', `Starting task ${taskId} attempt ${execution.attempt} in ${execution.workspace}`);
      
      // Setup workspace
      await this.setupWorkspace(execution.workspace);
      
      // Spawn Claude
      claude = pty.spawn('claude', [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: execution.workspace,
        env: process.env as any
      });
      
      execution.claude = claude;
      
      // Update cleanup
      const cleanup = this.cleanupTasks.get(taskId);
      if (cleanup) {
        cleanup.claude = claude;
      }
      
      // Monitor output
      claude.onData((data: string) => {
        execution.output.push(data);
        this.emit('output', taskId, data);
        
        // Check for completion
        if (this.detectCompletion(execution)) {
          execution.status = 'complete';
          this.completeTask(taskId);
        }
      });
      
      // Handle exit
      claude.onExit(() => {
        if (execution.status === 'running') {
          execution.status = 'failed';
          logDebug('DECOMPOSER_V2', `Claude exited unexpectedly for task ${taskId}`);
        }
      });
      
      // Wait for ready state
      await this.waitForReady(execution);
      
      // Send task prompt
      await this.sendPrompt(claude, execution.task.prompt);
      
      // Wait for completion
      await this.waitForCompletion(execution);
      
      // Collect created files
      execution.files = await this.collectFiles(execution.workspace, execution.task.outputs);
      
      // Verify success
      if (execution.task.outputs.every(file => execution.files.has(file))) {
        execution.status = 'complete';
        logDebug('DECOMPOSER_V2', `Task ${taskId} completed successfully`);
      } else {
        const missing = execution.task.outputs.filter(f => !execution.files.has(f));
        logDebug('DECOMPOSER_V2', `Task ${taskId} missing outputs: ${missing.join(', ')}`);
        throw new Error(`Missing expected outputs: ${missing.join(', ')}`);
      }
      
    } finally {
      // Cleanup task-specific resources
      if (claude && execution.status !== 'running') {
        claude.kill();
      }
    }
  }
  
  private async waitForReady(execution: TaskExecution): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Claude ready timeout'));
      }, 30000);
      
      const cleanup = this.cleanupTasks.get(execution.task.id);
      if (cleanup) {
        cleanup.timeouts.push(timeout);
      }
      
      const checkReady = () => {
        const output = execution.output.join('');
        // Claude shows a '>' prompt when ready
        if (output.endsWith('> ') || output.includes('> \n')) {
          clearTimeout(timeout);
          clearInterval(interval);
          resolve();
        }
      };
      
      // Check periodically
      const interval = setInterval(checkReady, 100);
      if (cleanup) {
        cleanup.intervals.push(interval);
      }
      
      // Handle early exit
      execution.claude?.onExit(() => {
        clearInterval(interval);
        clearTimeout(timeout);
        reject(new Error('Claude exited before ready'));
      });
    });
  }
  
  private async sendPrompt(claude: pty.IPty, prompt: string): Promise<void> {
    // Human-like typing (50-150ms per char)
    for (const char of prompt) {
      claude.write(char);
      await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
    }
    
    // Pause before submit
    await new Promise(r => setTimeout(r, 300));
    
    // Submit with Ctrl+Enter
    claude.write(CLAUDE_CONTROLS.SUBMIT);
  }
  
  private detectCompletion(execution: TaskExecution): boolean {
    const output = execution.output.join('');
    
    // Multiple detection strategies
    const indicators = [
      // File creation confirmation
      () => execution.task.outputs.some(f => 
        output.includes(`Created ${f}`) || 
        output.includes(`created ${f}`) ||
        output.includes(`Wrote to ${f}`) ||
        output.includes(`File saved: ${f}`)
      ),
      
      // Code block completion (at least one complete block)
      () => {
        const codeBlocks = output.match(/```[\s\S]*?```/g);
        return codeBlocks && codeBlocks.length >= 1;
      },
      
      // Time-based with file check
      () => {
        const elapsed = Date.now() - execution.startTime;
        if (elapsed > 4 * 60 * 1000) {
          // After 4 minutes, check if any expected files exist
          return this.checkFilesExist(execution);
        }
        return false;
      }
    ];
    
    return indicators.some(check => check());
  }
  
  private checkFilesExist(execution: TaskExecution): boolean {
    return execution.task.outputs.some(file => {
      try {
        const filePath = path.join(execution.workspace, file);
        const stats = fs.stat(filePath);
        return true;
      } catch {
        return false;
      }
    });
  }
  
  private async waitForCompletion(execution: TaskExecution): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (execution.status !== 'running') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
      
      const cleanup = this.cleanupTasks.get(execution.task.id);
      if (cleanup) {
        cleanup.intervals.push(checkInterval);
      }
    });
  }
  
  private completeTask(taskId: string): void {
    const execution = this.executions.get(taskId);
    if (!execution) return;
    
    // Kill Claude gracefully
    if (execution.claude) {
      execution.claude.kill();
    }
    
    this.emit('complete', taskId);
  }
  
  private interruptTask(taskId: string): void {
    const execution = this.executions.get(taskId);
    if (!execution) return;
    
    execution.status = 'timeout';
    
    if (execution.claude) {
      // Send interrupt signal
      execution.claude.write(CLAUDE_CONTROLS.INTERRUPT);
      
      // Give it a moment to respond
      setTimeout(() => {
        if (execution.claude) {
          execution.claude.kill();
        }
      }, 1000);
    }
    
    this.emit('timeout', taskId);
  }
  
  private async setupWorkspace(workspace: string): Promise<void> {
    // Create basic structure
    await fs.mkdir(path.join(workspace, 'models'), { recursive: true });
    await fs.mkdir(path.join(workspace, 'routes'), { recursive: true });
    await fs.mkdir(path.join(workspace, 'tests'), { recursive: true });
    await fs.mkdir(path.join(workspace, 'middleware'), { recursive: true });
    await fs.mkdir(path.join(workspace, 'config'), { recursive: true });
    
    // Add package.json
    await fs.writeFile(
      path.join(workspace, 'package.json'),
      JSON.stringify({
        name: 'axiom-task',
        version: '1.0.0',
        type: 'module'
      }, null, 2)
    );
  }
  
  private async collectFiles(workspace: string, expectedFiles: string[]): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    
    for (const file of expectedFiles) {
      try {
        const content = await fs.readFile(path.join(workspace, file), 'utf-8');
        files.set(file, content);
      } catch (error) {
        // File doesn't exist
        logDebug('DECOMPOSER_V2', `File not found: ${file}`);
      }
    }
    
    return files;
  }
  
  private async executeReserves(
    reserves: OrthogonalTask[], 
    failures: TaskExecution[]
  ): Promise<Map<string, TaskExecution>> {
    const results = new Map<string, TaskExecution>();
    
    // Find applicable reserves
    for (const reserve of reserves) {
      const shouldExecute = 
        reserve.trigger === 'after-orthogonal' ||
        (reserve.trigger === 'roadblock' && failures.length > 0);
        
      if (shouldExecute) {
        logDebug('DECOMPOSER_V2', `Executing reserve task: ${reserve.id}`);
        
        // Execute reserve task with collected files
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
        
        // Create execution
        const execution: TaskExecution = {
          task: reserve,
          status: 'pending',
          workspace,
          startTime: 0,
          output: [],
          files: new Map(),
          attempt: 0
        };
        
        this.executions.set(reserve.id, execution);
        this.registerCleanup(reserve.id, { workspace, intervals: [], timeouts: [] });
        
        await this.executeSingleTask(reserve.id);
        
        const result = this.executions.get(reserve.id)!;
        results.set(reserve.id, result);
      }
    }
    
    return results;
  }
  
  async merge(executions: Map<string, TaskExecution>): Promise<Map<string, string>> {
    logDebug('DECOMPOSER_V2', 'Merging results using MCTS strategy');
    
    const merged = new Map<string, string>();
    const scores = new Map<string, number>();
    
    // Score each execution
    for (const [id, exec] of executions) {
      if (exec.status === 'complete') {
        scores.set(id, this.scoreExecution(exec));
      }
    }
    
    // For each expected file, pick best implementation
    const allFiles = new Set<string>();
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
            bestContent = exec.files.get(file)!;
            bestSource = id;
          }
        }
      }
      
      if (bestContent) {
        merged.set(file, bestContent);
        logDebug('DECOMPOSER_V2', `Selected ${file} from ${bestSource} (score: ${bestScore})`);
      }
    }
    
    return merged;
  }
  
  private scoreExecution(exec: TaskExecution): number {
    let score = 0;
    
    // Completed successfully
    if (exec.status === 'complete') score += 0.5;
    
    // Created expected files
    const expectedCount = exec.task.outputs.length;
    const createdCount = exec.task.outputs.filter(f => exec.files.has(f)).length;
    score += (createdCount / expectedCount) * 0.3;
    
    // Code quality heuristics
    for (const [file, content] of exec.files) {
      if (content.includes('test')) score += 0.05;
      if (content.includes('error')) score += 0.05;
      if (content.includes('TODO')) score -= 0.1;
      if (content.includes('async')) score += 0.05;
      if (content.includes('export')) score += 0.05;
      if (content.includes('import')) score += 0.05;
    }
    
    // Attempts penalty
    score -= (exec.attempt - 1) * 0.1;
    
    return Math.max(0, Math.min(1, score));
  }
  
  // Public API methods
  getExecutions(): Map<string, TaskExecution> {
    return new Map(this.executions); // Return copy
  }
  
  getExecution(taskId: string): TaskExecution | undefined {
    return this.executions.get(taskId);
  }
  
  async mergeLatest(): Promise<Map<string, string>> {
    return this.merge(this.executions);
  }
  
  // Cleanup methods
  private registerCleanup(taskId: string, cleanup: CleanupTask): void {
    this.cleanupTasks.set(taskId, cleanup);
  }
  
  async cleanup(taskId: string): Promise<void> {
    const cleanup = this.cleanupTasks.get(taskId);
    if (!cleanup) return;
    
    try {
      // Kill process
      if (cleanup.claude) {
        cleanup.claude.kill();
      }
      
      // Clear intervals
      for (const interval of cleanup.intervals) {
        clearInterval(interval);
      }
      
      // Clear timeouts
      for (const timeout of cleanup.timeouts) {
        clearTimeout(timeout);
      }
      
      // Remove temp directory
      if (cleanup.workspace) {
        await fs.rm(cleanup.workspace, { recursive: true, force: true })
          .catch(e => logDebug('CLEANUP', `Error removing ${cleanup.workspace}: ${e}`));
      }
      
      // Remove from maps
      this.executions.delete(taskId);
      this.cleanupTasks.delete(taskId);
      
    } catch (error: any) {
      logDebug('CLEANUP', `Error cleaning up ${taskId}: ${error.message}`);
    }
  }
  
  async cleanupAll(): Promise<void> {
    logDebug('DECOMPOSER_V2', 'Cleaning up all tasks...');
    
    const cleanupPromises: Promise<void>[] = [];
    
    for (const [taskId, _] of this.cleanupTasks) {
      cleanupPromises.push(this.cleanup(taskId));
    }
    
    await Promise.allSettled(cleanupPromises);
    
    this.executions.clear();
    this.cleanupTasks.clear();
    
    logDebug('DECOMPOSER_V2', 'Cleanup complete');
  }
}

// Global instance
let decomposer: OrthogonalDecomposerV2 | null = null;

export async function axiomOrthogonalDecomposeV2(params: z.infer<typeof orthogonalDecomposerSchema>) {
  if (!decomposer) {
    decomposer = new OrthogonalDecomposerV2();
  }
  
  const { action, prompt, taskIds, strategy } = params;
  
  switch (action) {
    case 'decompose':
      if (!prompt) throw new Error('Prompt required for decompose action');
      const tasks = await decomposer.decompose(prompt);
      return JSON.stringify({ tasks }, null, 2);
      
    case 'execute':
      if (!prompt) throw new Error('Prompt required for execute action');
      
      // Decompose and execute
      const decomposed = await decomposer.decompose(prompt);
      const results = await decomposer.execute(decomposed);
      
      // Convert to serializable format
      const summary = Array.from(results.entries()).map(([id, exec]) => ({
        id,
        status: exec.status,
        outputs: Array.from(exec.files.keys()),
        duration: exec.startTime ? Date.now() - exec.startTime : 0,
        attempts: exec.attempt
      }));
      
      return JSON.stringify({ 
        totalTasks: decomposed.length,
        completed: summary.filter(s => s.status === 'complete').length,
        failed: summary.filter(s => s.status === 'failed').length,
        tasks: summary
      }, null, 2);
      
    case 'merge':
      const merged = await decomposer.mergeLatest();
      
      return JSON.stringify({
        mergedFiles: Array.from(merged.keys()),
        totalSize: Array.from(merged.values()).reduce((sum, content) => sum + content.length, 0)
      }, null, 2);
      
    case 'status':
      const executions = decomposer.getExecutions();
      const status = Array.from(executions.entries()).map(([id, exec]) => ({
        id,
        status: exec.status,
        duration: exec.startTime ? Date.now() - exec.startTime : 0,
        outputSize: exec.output.length,
        attempts: exec.attempt
      }));
      
      return JSON.stringify({ tasks: status }, null, 2);
      
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}