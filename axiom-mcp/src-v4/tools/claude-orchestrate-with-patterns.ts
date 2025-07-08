/**
 * Enhanced Claude Orchestrator with Pattern-Based Intervention
 * 
 * This integrates the pattern scanner and intervention controller
 * with Claude instance management for real-time intervention.
 */

import { z } from 'zod';
import { spawn, IPty } from 'node-pty';
import { EventEmitter } from 'events';
import { logDebug } from '../core/simple-logger.js';
import { InterventionController } from '../core/intervention-controller.js';

// Enhanced schema with pattern control
export const axiomClaudeOrchestrateEnhancedSchema = z.object({
  action: z.enum(['spawn', 'prompt', 'steer', 'get_output', 'status', 'cleanup', 'add_pattern', 'get_interventions']),
  instanceId: z.string(),
  prompt: z.string().optional(),
  lines: z.number().optional().default(20),
  pattern: z.object({
    id: z.string(),
    pattern: z.string(), // Will be converted to RegExp
    action: z.string(),
    priority: z.number(),
    cooldown: z.number().optional(),
    description: z.string()
  }).optional()
});

type ClaudeAction = z.infer<typeof axiomClaudeOrchestrateEnhancedSchema>;

interface ClaudeInstance {
  pty: IPty;
  output: string[];
  state: 'starting' | 'ready' | 'working' | 'complete' | 'error';
  startTime: number;
  lastActivity: number;
  interventionController: InterventionController;
  interventionCount: number;
}

class EnhancedClaudeOrchestrator extends EventEmitter {
  private instances: Map<string, ClaudeInstance> = new Map();
  private maxInstances = 10;
  private instanceTimeout = 300000; // 5 minutes

  async spawn(instanceId: string): Promise<string> {
    if (this.instances.has(instanceId)) {
      return `Instance ${instanceId} already exists`;
    }

    if (this.instances.size >= this.maxInstances) {
      throw new Error(`Maximum instances (${this.maxInstances}) reached`);
    }

    logDebug('CLAUDE_ORCHESTRATE', `Spawning Claude instance: ${instanceId}`);

    // Create intervention controller for this instance
    const interventionController = new InterventionController();
    
    // Set up intervention handlers
    this.setupInterventionHandlers(instanceId, interventionController);

    const pty = spawn('claude', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env
    });

    const instance: ClaudeInstance = {
      pty,
      output: [],
      state: 'starting',
      startTime: Date.now(),
      lastActivity: Date.now(),
      interventionController,
      interventionCount: 0
    };

    // Handle output with pattern scanning
    pty.onData((data: string) => {
      instance.output.push(data);
      instance.lastActivity = Date.now();
      
      // Limit output buffer
      if (instance.output.length > 10000) {
        instance.output = instance.output.slice(-5000);
      }

      // Process output through intervention controller
      const matches = interventionController.processOutput(instanceId, data, instanceId);
      
      if (matches.length > 0) {
        logDebug('CLAUDE_ORCHESTRATE', `Patterns detected in ${instanceId}:`, 
          matches.map(m => m.action));
      }

      // Check if ready
      if (instance.state === 'starting' && data.includes('Ready')) {
        instance.state = 'ready';
        logDebug('CLAUDE_ORCHESTRATE', `Claude instance ${instanceId} is ready`);
      }

      // Detect code blocks
      if (data.includes('```')) {
        instance.state = 'working';
        logDebug('CLAUDE_ORCHESTRATE', `Code block detected in ${instanceId}`);
      }
    });

    pty.onExit(() => {
      instance.state = 'complete';
      logDebug('CLAUDE_ORCHESTRATE', `Claude instance ${instanceId} exited`);
      this.instances.delete(instanceId);
    });

    this.instances.set(instanceId, instance);

    // Set up timeout
    setTimeout(() => {
      if (this.instances.has(instanceId)) {
        this.cleanup(instanceId);
      }
    }, this.instanceTimeout);

    return `Claude instance ${instanceId} spawned and monitoring patterns`;
  }

  private setupInterventionHandlers(instanceId: string, controller: InterventionController) {
    // Handle interrupt requirements
    controller.on('interrupt-required', async (event) => {
      logDebug('CLAUDE_ORCHESTRATE', `Interrupt required for ${instanceId}:`, event);
      
      const instance = this.instances.get(instanceId);
      if (!instance) return;

      // Send ESC to interrupt
      instance.pty.write('\x1b');
      await this.delay(500);

      // Send the intervention message
      await this.typeSlowly(instance.pty, event.message);
      instance.pty.write('\x0d'); // Submit

      instance.interventionCount++;
      controller.markHandled(instanceId, event.action, true);

      this.emit('intervention-executed', {
        instanceId,
        action: event.action,
        message: event.message
      });
    });

    // Handle progress tracking
    controller.on('track-progress', (event) => {
      logDebug('CLAUDE_ORCHESTRATE', `Progress tracked for ${instanceId}:`, event);
      this.emit('progress-tracked', {
        instanceId,
        match: event.match
      });
    });

    // Handle verification requests
    controller.on('verify-claim', async (event) => {
      logDebug('CLAUDE_ORCHESTRATE', `Verification needed for ${instanceId}:`, event);
      
      // Check if files were actually created
      const output = this.instances.get(instanceId)?.output.join('') || '';
      const hasEvidence = output.includes('File created') || 
                         output.includes('Successfully wrote') ||
                         output.includes('```');

      if (!hasEvidence) {
        // Interrupt and request actual implementation
        const instance = this.instances.get(instanceId);
        if (instance) {
          instance.pty.write('\x1b');
          await this.delay(500);
          await this.typeSlowly(instance.pty, "Show me the actual code you created. Write it to a file.");
          instance.pty.write('\x0d');
        }
      }

      this.emit('verification-result', {
        instanceId,
        hasEvidence,
        action: event.action
      });
    });
  }

  async sendPrompt(instanceId: string, prompt: string): Promise<string> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    if (instance.state !== 'ready') {
      throw new Error(`Instance ${instanceId} is not ready (state: ${instance.state})`);
    }

    logDebug('CLAUDE_ORCHESTRATE', `Sending prompt to ${instanceId}: ${prompt.substring(0, 50)}...`);

    // Type the prompt slowly
    await this.typeSlowly(instance.pty, prompt);

    // Submit with Ctrl+Enter
    instance.pty.write('\x0d');
    instance.state = 'working';

    return `Prompt sent to ${instanceId}`;
  }

  async steer(instanceId: string, newPrompt: string): Promise<string> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    logDebug('CLAUDE_ORCHESTRATE', `Steering ${instanceId} to: ${newPrompt.substring(0, 50)}...`);

    // Send ESC to interrupt
    instance.pty.write('\x1b');
    
    // Wait a bit
    await this.delay(500);

    // Send new prompt
    await this.typeSlowly(instance.pty, newPrompt);
    instance.pty.write('\x0d');

    instance.interventionCount++;

    return `Instance ${instanceId} steered to new task (total interventions: ${instance.interventionCount})`;
  }

  getOutput(instanceId: string, lines?: number): string {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    let output = instance.output.join('');
    
    if (lines && lines > 0) {
      const outputLines = output.split('\n');
      output = outputLines.slice(-lines).join('\n');
    }

    return output;
  }

  getStatus(instanceId: string): any {
    if (instanceId === '*') {
      // Return all instances
      const instances = Array.from(this.instances.entries()).map(([id, inst]) => ({
        id,
        state: inst.state,
        uptime: Date.now() - inst.startTime,
        lastActivity: Date.now() - inst.lastActivity,
        outputSize: inst.output.join('').length,
        interventionCount: inst.interventionCount,
        interventionStats: inst.interventionController.getSummaryReport()
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
      uptime: Date.now() - instance.startTime,
      lastActivity: Date.now() - instance.lastActivity,
      outputSize: instance.output.join('').length,
      interventionCount: instance.interventionCount,
      interventionStats: instance.interventionController.getSummaryReport()
    };
  }

  async cleanup(instanceId: string): Promise<string> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return `Instance ${instanceId} not found`;
    }

    logDebug('CLAUDE_ORCHESTRATE', `Cleaning up Claude instance ${instanceId}`);

    try {
      instance.interventionController.reset();
      instance.pty.kill();
    } catch (error) {
      // Ignore errors during cleanup
    }

    this.instances.delete(instanceId);
    return `Instance ${instanceId} cleaned up`;
  }

  async cleanupAll(): Promise<void> {
    const instanceIds = Array.from(this.instances.keys());
    for (const id of instanceIds) {
      await this.cleanup(id);
    }
  }

  addPattern(instanceId: string, pattern: any): string {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    // Convert string pattern to RegExp
    const regexPattern = new RegExp(pattern.pattern, 'i');
    
    instance.interventionController.addPattern({
      ...pattern,
      pattern: regexPattern
    });

    return `Pattern ${pattern.id} added to ${instanceId}`;
  }

  getInterventions(instanceId: string): any {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    return instance.interventionController.getTaskHistory(instanceId);
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
}

// Singleton orchestrator with pattern support
const orchestrator = new EnhancedClaudeOrchestrator();

// Cleanup on exit
process.on('SIGINT', () => orchestrator.cleanupAll());
process.on('SIGTERM', () => orchestrator.cleanupAll());

// Export enhanced function
export async function axiomClaudeOrchestrateEnhanced(args: ClaudeAction): Promise<string> {
  const { action, instanceId, prompt, lines, pattern } = args;

  logDebug('CLAUDE_ORCHESTRATE', `Enhanced orchestrate: ${action} on ${instanceId}`);

  try {
    switch (action) {
      case 'spawn':
        return await orchestrator.spawn(instanceId);
        
      case 'prompt':
        if (!prompt) throw new Error('Prompt required for prompt action');
        return await orchestrator.sendPrompt(instanceId, prompt);
        
      case 'steer':
        if (!prompt) throw new Error('Prompt required for steer action');
        return await orchestrator.steer(instanceId, prompt);
        
      case 'get_output':
        return JSON.stringify({
          output: orchestrator.getOutput(instanceId, lines)
        });
        
      case 'status':
        return JSON.stringify(orchestrator.getStatus(instanceId));
        
      case 'cleanup':
        return await orchestrator.cleanup(instanceId);
        
      case 'add_pattern':
        if (!pattern) throw new Error('Pattern required for add_pattern action');
        return orchestrator.addPattern(instanceId, pattern);
        
      case 'get_interventions':
        return JSON.stringify(orchestrator.getInterventions(instanceId));
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    throw new Error(`Claude orchestration error: ${error.message}`);
  }
}