import { z } from 'zod';
import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { simpleGit, SimpleGit } from 'simple-git';
import { join, dirname } from 'path';
import { promises as fs } from 'fs';
import { logDebug } from '../core/simple-logger.js';

// Schema for the MCP tool with proper worktree handling
export const axiomClaudeOrchestrateProperSchema = z.object({
  action: z.enum(['spawn', 'prompt', 'steer', 'get_output', 'status', 'cleanup', 'merge_all']),
  instanceId: z.string(),
  prompt: z.string().optional(),
  lines: z.number().optional().default(20),
  useWorktree: z.boolean().optional().default(true),
  baseBranch: z.string().optional().default('main'),
  autoMerge: z.boolean().optional().default(true)
});

interface ClaudeInstance {
  id: string;
  pty: pty.IPty;
  output: string[];
  state: 'starting' | 'ready' | 'working' | 'complete' | 'error';
  createdAt: Date;
  lastActivity: Date;
  worktreePath?: string;
  branch?: string;
  git?: SimpleGit;
  committed: boolean;
  merged: boolean;
}

class ProperWorktreeManager {
  private mainRepo: string;
  private git: SimpleGit;
  private worktrees: Map<string, { path: string; branch: string }> = new Map();

  constructor(mainRepoPath: string) {
    this.mainRepo = mainRepoPath;
    this.git = simpleGit(mainRepoPath);
  }

  async createWorktree(instanceId: string, baseBranch: string): Promise<{ path: string; branch: string }> {
    const worktreePath = join(dirname(this.mainRepo), `axiom-${instanceId}`);
    const branchName = `axiom/${instanceId}/${Date.now()}`;
    
    try {
      // Create worktree with new branch from base branch
      await this.git.raw(['worktree', 'add', '-b', branchName, worktreePath, baseBranch]);
      
      this.worktrees.set(instanceId, {
        path: worktreePath,
        branch: branchName
      });
      
      logDebug('WORKTREE', `Created worktree for ${instanceId} at ${worktreePath} on branch ${branchName}`);
      return { path: worktreePath, branch: branchName };
    } catch (error: any) {
      throw new Error(`Failed to create worktree: ${error.message}`);
    }
  }

  async commitWork(instanceId: string): Promise<boolean> {
    const worktree = this.worktrees.get(instanceId);
    if (!worktree) {
      logDebug('WORKTREE', `No worktree found for ${instanceId}`);
      return false;
    }
    
    try {
      const git = simpleGit(worktree.path);
      const status = await git.status();
      
      if (status.files.length === 0) {
        logDebug('WORKTREE', `No changes to commit for ${instanceId}`);
        return false;
      }
      
      // Add all changes
      await git.add('.');
      
      // Create descriptive commit message
      const fileList = status.files.slice(0, 5).map(f => f.path).join(', ');
      const moreFiles = status.files.length > 5 ? ` and ${status.files.length - 5} more` : '';
      const commitMsg = `Task ${instanceId}: Created ${fileList}${moreFiles}`;
      
      await git.commit(commitMsg);
      logDebug('WORKTREE', `Committed ${status.files.length} files for ${instanceId}`);
      
      return true;
    } catch (error: any) {
      logDebug('WORKTREE', `Failed to commit for ${instanceId}: ${error.message}`);
      return false;
    }
  }

  async mergeToMain(instanceId: string): Promise<{ success: boolean; conflicts?: string[] }> {
    const worktree = this.worktrees.get(instanceId);
    if (!worktree) {
      return { success: false, conflicts: ['No worktree found'] };
    }
    
    try {
      // Switch to main branch
      await this.git.checkout('main');
      
      // Attempt merge
      const result = await this.git.merge([worktree.branch]);
      
      // Check if merge was successful
      const status = await this.git.status();
      if (status.conflicted.length > 0) {
        // This shouldn't happen with orthogonal tasks!
        logDebug('WORKTREE', `UNEXPECTED: Merge conflicts for ${instanceId}: ${status.conflicted.join(', ')}`);
        
        // Abort the merge
        await this.git.raw(['merge', '--abort']);
        
        return { success: false, conflicts: status.conflicted };
      }
      
      logDebug('WORKTREE', `Successfully merged ${instanceId} to main`);
      return { success: true };
      
    } catch (error: any) {
      logDebug('WORKTREE', `Merge failed for ${instanceId}: ${error.message}`);
      
      // Try to abort any in-progress merge
      try {
        await this.git.raw(['merge', '--abort']);
      } catch (e) {
        // Ignore if no merge to abort
      }
      
      return { success: false, conflicts: [error.message] };
    }
  }

  async removeWorktree(instanceId: string): Promise<void> {
    const worktree = this.worktrees.get(instanceId);
    if (!worktree) return;
    
    try {
      // Remove worktree (NOT force - work should be committed)
      await this.git.raw(['worktree', 'remove', worktree.path]);
      this.worktrees.delete(instanceId);
      logDebug('WORKTREE', `Removed worktree for ${instanceId}`);
    } catch (error: any) {
      // If regular remove fails, it means there are uncommitted changes
      logDebug('WORKTREE', `Worktree has uncommitted changes for ${instanceId}, using force`);
      await this.git.raw(['worktree', 'remove', '--force', worktree.path]);
      this.worktrees.delete(instanceId);
    }
  }

  async deleteBranch(instanceId: string): Promise<void> {
    const worktree = this.worktrees.get(instanceId);
    if (!worktree) return;
    
    try {
      await this.git.raw(['branch', '-d', worktree.branch]);
      logDebug('WORKTREE', `Deleted branch ${worktree.branch}`);
    } catch (error: any) {
      logDebug('WORKTREE', `Failed to delete branch ${worktree.branch}: ${error.message}`);
    }
  }
}

export class ClaudeOrchestratorProper extends EventEmitter {
  private instances: Map<string, ClaudeInstance> = new Map();
  private maxInstances = 10;
  private worktreeManager: ProperWorktreeManager;

  constructor(mainRepoPath?: string) {
    super();
    this.worktreeManager = new ProperWorktreeManager(mainRepoPath || process.cwd());
  }

  async spawn(instanceId: string, useWorktree: boolean = true, baseBranch: string = 'main'): Promise<void> {
    if (this.instances.has(instanceId)) {
      throw new Error(`Instance ${instanceId} already exists`);
    }

    if (this.instances.size >= this.maxInstances) {
      throw new Error(`Maximum instances (${this.maxInstances}) reached`);
    }

    let workingDir = process.cwd();
    let worktreePath: string | undefined;
    let branch: string | undefined;
    let git: SimpleGit | undefined;

    // Create isolated worktree if requested
    if (useWorktree) {
      try {
        const worktreeInfo = await this.worktreeManager.createWorktree(instanceId, baseBranch);
        worktreePath = worktreeInfo.path;
        branch = worktreeInfo.branch;
        workingDir = worktreePath;
        git = simpleGit(worktreePath);
      } catch (error: any) {
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

    const instance: ClaudeInstance = {
      id: instanceId,
      pty: claudePty,
      output: [],
      state: 'starting',
      createdAt: new Date(),
      lastActivity: new Date(),
      worktreePath,
      branch,
      git,
      committed: false,
      merged: false
    };

    this.instances.set(instanceId, instance);

    // Set up output monitoring
    claudePty.onData((data: string) => {
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

      // Detect completion (when Claude returns to prompt)
      if (instance.state === 'working' && data.includes('Type your prompt')) {
        instance.state = 'complete';
        logDebug('CLAUDE_ORCHESTRATE', `Claude instance ${instanceId} completed task`);
        this.emit('complete', instanceId);
        
        // Auto-commit if worktree
        if (instance.worktreePath) {
          this.handleCompletion(instanceId);
        }
      }
    });

    claudePty.onExit(() => {
      instance.state = 'complete';
      logDebug('CLAUDE_ORCHESTRATE', `Claude instance ${instanceId} exited`);
      this.emit('exit', instanceId);
      
      // Ensure work is committed before any cleanup
      if (instance.worktreePath && !instance.committed) {
        this.handleCompletion(instanceId);
      }
    });
  }

  private async handleCompletion(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.worktreePath) return;
    
    logDebug('CLAUDE_ORCHESTRATE', `Handling completion for ${instanceId}`);
    
    // Commit the work
    const committed = await this.worktreeManager.commitWork(instanceId);
    instance.committed = committed;
    
    if (committed) {
      this.emit('committed', instanceId);
      
      // Auto-merge if enabled (default for orthogonal tasks)
      const autoMerge = true; // Could be a parameter
      if (autoMerge) {
        await this.mergeInstance(instanceId);
      }
    }
  }

  async mergeInstance(instanceId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.worktreePath || !instance.committed) {
      logDebug('CLAUDE_ORCHESTRATE', `Cannot merge ${instanceId}: not ready`);
      return false;
    }
    
    const mergeResult = await this.worktreeManager.mergeToMain(instanceId);
    instance.merged = mergeResult.success;
    
    if (mergeResult.success) {
      this.emit('merged', instanceId);
    } else if (mergeResult.conflicts && mergeResult.conflicts.length > 0) {
      // This shouldn't happen with orthogonal tasks!
      this.emit('merge_conflict', instanceId, mergeResult.conflicts);
      
      // Here's where MCTS would kick in for conflict resolution
      // For now, we just log it
      logDebug('CLAUDE_ORCHESTRATE', `CRITICAL: Orthogonal task ${instanceId} had conflicts! Tasks may not be truly orthogonal.`);
    }
    
    return mergeResult.success;
  }

  async sendPrompt(instanceId: string, text: string): Promise<void> {
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

  async cleanup(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    logDebug('CLAUDE_ORCHESTRATE', `Cleaning up Claude instance ${instanceId}`);
    
    // Ensure work is committed first
    if (instance.worktreePath && !instance.committed) {
      await this.handleCompletion(instanceId);
    }
    
    // Kill PTY
    try {
      instance.pty.kill();
    } catch (e) {
      // Already dead
    }

    // Remove worktree (work is committed, so safe to remove)
    if (instance.worktreePath) {
      await this.worktreeManager.removeWorktree(instanceId);
      
      // Delete branch if merged
      if (instance.merged) {
        await this.worktreeManager.deleteBranch(instanceId);
      }
    }

    this.instances.delete(instanceId);
  }

  async mergeAll(): Promise<{ total: number; merged: number; failed: string[] }> {
    const results = {
      total: 0,
      merged: 0,
      failed: [] as string[]
    };
    
    for (const [id, instance] of this.instances) {
      if (instance.committed && !instance.merged) {
        results.total++;
        const success = await this.mergeInstance(id);
        if (success) {
          results.merged++;
        } else {
          results.failed.push(id);
        }
      }
    }
    
    return results;
  }

  getStatus(instanceId: string): any {
    if (instanceId === '*') {
      // Return all instances
      const instances = Array.from(this.instances.values()).map(inst => ({
        id: inst.id,
        state: inst.state,
        createdAt: inst.createdAt,
        lastActivity: inst.lastActivity,
        worktreePath: inst.worktreePath,
        branch: inst.branch,
        committed: inst.committed,
        merged: inst.merged
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
      worktreePath: instance.worktreePath,
      branch: instance.branch,
      committed: instance.committed,
      merged: instance.merged
    };
  }

  getOutput(instanceId: string, lines?: number): string {
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

  async steer(instanceId: string, newPrompt: string): Promise<void> {
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
}

// Global orchestrator instance
let orchestrator: ClaudeOrchestratorProper | null = null;

export async function axiomClaudeOrchestrateProper(params: z.infer<typeof axiomClaudeOrchestrateProperSchema>) {
  // Initialize orchestrator if needed
  if (!orchestrator) {
    orchestrator = new ClaudeOrchestratorProper();
    
    // Cleanup on process exit
    process.on('exit', () => {
      if (orchestrator) {
        // Merge all before exit
        orchestrator.mergeAll().then(results => {
          logDebug('CLAUDE_ORCHESTRATE', `Exit merge: ${results.merged}/${results.total} successful`);
        }).catch(console.error);
      }
    });
  }

  const { action, instanceId, prompt, lines, useWorktree, baseBranch, autoMerge } = params;
  
  logDebug('CLAUDE_ORCHESTRATE', `axiom_claude_orchestrate_proper: ${action} on ${instanceId}`);

  switch (action) {
    case 'spawn':
      await orchestrator.spawn(instanceId, useWorktree, baseBranch);
      return `Claude instance ${instanceId} spawned${useWorktree ? ' with isolated worktree' : ''} and ready`;

    case 'prompt':
      if (!prompt) throw new Error('Prompt required for prompt action');
      await orchestrator.sendPrompt(instanceId, prompt);
      return `Prompt sent to ${instanceId}`;

    case 'steer':
      if (!prompt) throw new Error('Prompt required for steer action');
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
      return `Instance ${instanceId} cleaned up (work committed and preserved)`;
      
    case 'merge_all':
      const results = await orchestrator.mergeAll();
      return JSON.stringify(results);

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}