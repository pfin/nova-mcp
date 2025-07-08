/**
 * Parallel Execution Observatory - The heart of Axiom
 * 
 * Runs multiple Claude instances in parallel, observes their output,
 * kills bad paths before toxic completion, amplifies successful paths.
 */

import { EventEmitter } from 'events';
import { spawn, IPty } from 'node-pty';
import { PatternScanner } from './pattern-scanner.js';
import { InterventionController } from './intervention-controller.js';
import { TaskDecomposer, DecomposedTask, Subtask } from './task-decomposer.js';
import { logDebug } from './simple-logger.js';

export interface ExecutionInstance {
  id: string;
  subtask: Subtask;
  pty: IPty;
  scanner: PatternScanner;
  controller: InterventionController;
  output: string;
  startTime: number;
  state: 'spawning' | 'executing' | 'intervening' | 'complete' | 'killed';
  interventions: number;
  successScore: number;
  failurePatterns: string[];
}

export interface ObservatoryStats {
  totalInstances: number;
  activeInstances: number;
  killedInstances: number;
  successfulInstances: number;
  totalInterventions: number;
  averageTimeToKill: number;
  averageTimeToSuccess: number;
}

export class ParallelExecutionObservatory extends EventEmitter {
  private instances: Map<string, ExecutionInstance> = new Map();
  private decomposer: TaskDecomposer;
  private stats: ObservatoryStats = {
    totalInstances: 0,
    activeInstances: 0,
    killedInstances: 0,
    successfulInstances: 0,
    totalInterventions: 0,
    averageTimeToKill: 0,
    averageTimeToSuccess: 0
  };
  private killTimes: number[] = [];
  private successTimes: number[] = [];
  
  // Axiom principles
  private readonly MAX_EXECUTION_TIME = 10 * 60 * 1000; // 10 minutes max
  private readonly INTERVENTION_LIMIT = 3; // Max interventions before kill
  private readonly TOXIC_PATTERN_THRESHOLD = 2; // Toxic patterns before kill
  
  constructor() {
    super();
    this.decomposer = new TaskDecomposer();
  }
  
  async executeTask(prompt: string): Promise<any> {
    logDebug('OBSERVATORY', `Starting parallel execution for: ${prompt}`);
    
    // Decompose into subtasks
    const decomposed = this.decomposer.decompose(prompt);
    this.emit('task-decomposed', decomposed);
    
    // Execute based on strategy
    switch (decomposed.strategy) {
      case 'parallel':
        return await this.executeParallel(decomposed);
      case 'race':
        return await this.executeRace(decomposed);
      case 'sequential':
        return await this.executeSequential(decomposed);
    }
  }
  
  private async executeParallel(task: DecomposedTask): Promise<any> {
    const results: any[] = [];
    const promises: Promise<any>[] = [];
    
    // Launch all orthogonal subtasks
    for (const subtask of task.subtasks.filter(t => t.orthogonal)) {
      promises.push(this.executeSubtask(subtask, task));
    }
    
    // Wait for all to complete or timeout
    const outcomes = await Promise.allSettled(promises);
    
    // Collect successful results
    for (const outcome of outcomes) {
      if (outcome.status === 'fulfilled' && outcome.value.success) {
        results.push(outcome.value);
      }
    }
    
    // Synthesize results
    return this.synthesizeResults(results, task);
  }
  
  private async executeRace(task: DecomposedTask): Promise<any> {
    const promises: Promise<any>[] = [];
    
    // Launch all competing approaches
    for (const subtask of task.subtasks) {
      promises.push(this.executeSubtask(subtask, task));
    }
    
    // First successful completion wins
    try {
      const winner = await Promise.race(promises.map(p => 
        p.then(result => result.success ? result : Promise.reject('Failed'))
      ));
      
      // Kill other instances
      this.killAllExcept(winner.instanceId);
      
      return winner;
    } catch (error) {
      // All failed
      return { success: false, error: 'All approaches failed' };
    }
  }
  
  private async executeSequential(task: DecomposedTask): Promise<any> {
    // TODO: Implement dependency-based execution
    throw new Error('Sequential execution not yet implemented');
  }
  
  private async executeSubtask(subtask: Subtask, parentTask: DecomposedTask): Promise<any> {
    const instanceId = `${parentTask.id}-${subtask.id}`;
    
    // Create monitoring infrastructure
    const scanner = new PatternScanner();
    const controller = new InterventionController();
    
    // Set up intervention handlers
    this.setupInterventionHandlers(instanceId, controller);
    
    // Spawn Claude instance
    const pty = spawn('claude', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env
    });
    
    const instance: ExecutionInstance = {
      id: instanceId,
      subtask,
      pty,
      scanner,
      controller,
      output: '',
      startTime: Date.now(),
      state: 'spawning',
      interventions: 0,
      successScore: 0,
      failurePatterns: []
    };
    
    this.instances.set(instanceId, instance);
    this.stats.totalInstances++;
    this.stats.activeInstances++;
    
    // Monitor output
    pty.onData((data: string) => {
      instance.output += data;
      
      // Process through pattern scanner
      const matches = controller.processOutput(instanceId, data);
      
      // Update success/failure scores
      this.updateScores(instance, matches);
      
      // Check kill conditions
      if (this.shouldKill(instance)) {
        this.killInstance(instanceId, 'Toxic patterns detected');
      }
    });
    
    // Set up timeout
    setTimeout(() => {
      if (this.instances.has(instanceId)) {
        this.killInstance(instanceId, 'Timeout');
      }
    }, this.MAX_EXECUTION_TIME);
    
    // Wait for ready state
    await this.waitForReady(instance);
    
    // Send the prompt
    instance.state = 'executing';
    await this.typeSlowly(pty, subtask.prompt);
    pty.write('\x0d'); // Submit
    
    // Wait for completion or kill
    return await this.waitForCompletion(instance, parentTask);
  }
  
  private setupInterventionHandlers(instanceId: string, controller: InterventionController) {
    controller.on('interrupt-required', async (event) => {
      const instance = this.instances.get(instanceId);
      if (!instance) return;
      
      instance.interventions++;
      instance.state = 'intervening';
      
      // Check intervention limit
      if (instance.interventions >= this.INTERVENTION_LIMIT) {
        this.killInstance(instanceId, 'Too many interventions');
        return;
      }
      
      // Execute intervention
      instance.pty.write('\x1b'); // ESC
      await this.delay(500);
      await this.typeSlowly(instance.pty, event.message);
      instance.pty.write('\x0d');
      
      instance.state = 'executing';
      this.stats.totalInterventions++;
      
      this.emit('intervention', {
        instanceId,
        intervention: event.message,
        count: instance.interventions
      });
    });
    
    controller.on('verify-claim', async (event) => {
      const instance = this.instances.get(instanceId);
      if (!instance) return;
      
      // Check for false completion
      const hasEvidence = /File created|Successfully wrote|```/.test(instance.output);
      if (!hasEvidence && event.match.match[0].includes('successfully')) {
        instance.failurePatterns.push('false-completion');
        instance.successScore -= 10;
        
        // Immediate kill for false claims
        this.killInstance(instanceId, 'False completion claim');
      }
    });
  }
  
  private updateScores(instance: ExecutionInstance, matches: any[]) {
    for (const match of matches) {
      if (match.action.startsWith('INTERRUPT_')) {
        instance.failurePatterns.push(match.action);
        instance.successScore -= 5;
      } else if (match.action.startsWith('TRACK_')) {
        instance.successScore += 10;
      }
    }
    
    // Boost score for actual implementation
    if (instance.output.includes('File created successfully')) {
      instance.successScore += 20;
    }
    if (instance.output.includes('```')) {
      instance.successScore += 5;
    }
  }
  
  private shouldKill(instance: ExecutionInstance): boolean {
    // Too many interventions
    if (instance.interventions >= this.INTERVENTION_LIMIT) return true;
    
    // Too many toxic patterns
    const toxicCount = instance.failurePatterns.filter(p => 
      p.includes('PLANNING') || p.includes('RESEARCH') || p.includes('false-completion')
    ).length;
    if (toxicCount >= this.TOXIC_PATTERN_THRESHOLD) return true;
    
    // Negative success score
    if (instance.successScore < -20) return true;
    
    // No progress after multiple interventions
    if (instance.interventions > 1 && instance.successScore <= 0) return true;
    
    return false;
  }
  
  private killInstance(instanceId: string, reason: string) {
    const instance = this.instances.get(instanceId);
    if (!instance || instance.state === 'killed') return;
    
    const lifetime = Date.now() - instance.startTime;
    this.killTimes.push(lifetime);
    
    logDebug('OBSERVATORY', `Killing instance ${instanceId}: ${reason}`);
    logDebug('OBSERVATORY', `Lifetime: ${lifetime}ms, Interventions: ${instance.interventions}, Score: ${instance.successScore}`);
    
    instance.state = 'killed';
    instance.pty.kill();
    
    this.stats.activeInstances--;
    this.stats.killedInstances++;
    this.stats.averageTimeToKill = 
      this.killTimes.reduce((a, b) => a + b, 0) / this.killTimes.length;
    
    this.emit('instance-killed', {
      instanceId,
      reason,
      lifetime,
      interventions: instance.interventions,
      score: instance.successScore
    });
  }
  
  private killAllExcept(winnerId: string) {
    for (const [id, instance] of this.instances) {
      if (id !== winnerId && instance.state !== 'killed') {
        this.killInstance(id, 'Lost race');
      }
    }
  }
  
  private async waitForReady(instance: ExecutionInstance): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = setInterval(() => {
        if (instance.output.includes('Ready') || 
            instance.output.includes('>') ||
            Date.now() - instance.startTime > 10000) {
          clearInterval(checkReady);
          resolve();
        }
      }, 100);
    });
  }
  
  private async waitForCompletion(instance: ExecutionInstance, parentTask: DecomposedTask): Promise<any> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        // Check if killed
        if (instance.state === 'killed') {
          clearInterval(checkInterval);
          resolve({ success: false, instanceId: instance.id, reason: 'killed' });
          return;
        }
        
        // Check if completed successfully
        const isValid = this.decomposer.validateSuccess(parentTask, instance.output);
        if (isValid) {
          clearInterval(checkInterval);
          instance.state = 'complete';
          
          const lifetime = Date.now() - instance.startTime;
          this.successTimes.push(lifetime);
          
          this.stats.activeInstances--;
          this.stats.successfulInstances++;
          this.stats.averageTimeToSuccess = 
            this.successTimes.reduce((a, b) => a + b, 0) / this.successTimes.length;
          
          resolve({
            success: true,
            instanceId: instance.id,
            output: instance.output,
            score: instance.successScore,
            lifetime
          });
        }
        
        // Check timeout
        if (Date.now() - instance.startTime > this.MAX_EXECUTION_TIME) {
          clearInterval(checkInterval);
          this.killInstance(instance.id, 'Timeout');
        }
      }, 500);
    });
  }
  
  private synthesizeResults(results: any[], task: DecomposedTask): any {
    if (results.length === 0) {
      return { success: false, error: 'No successful completions' };
    }
    
    // Sort by score
    results.sort((a, b) => b.score - a.score);
    
    // Return best result with synthesis info
    return {
      success: true,
      bestResult: results[0],
      allResults: results,
      synthesis: {
        totalAttempts: task.subtasks.length,
        successful: results.length,
        failed: task.subtasks.length - results.length,
        averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length
      },
      stats: this.getStats()
    };
  }
  
  private async typeSlowly(pty: IPty, text: string): Promise<void> {
    for (const char of text) {
      pty.write(char);
      await this.delay(50 + Math.random() * 100);
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getStats(): ObservatoryStats {
    return { ...this.stats };
  }
  
  getActiveInstances(): ExecutionInstance[] {
    return Array.from(this.instances.values()).filter(i => i.state !== 'killed');
  }
}