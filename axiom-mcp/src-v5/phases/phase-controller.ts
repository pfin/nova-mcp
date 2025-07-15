/**
 * Phase Controller - The Heart of V5's Cognitive Control
 * 
 * Controls the 4 phases with strict tool access and time limits
 */

import { EventEmitter } from 'events';
import { spawn, IPty } from 'node-pty';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface PhaseConfig {
  duration: number; // minutes
  allowedTools: string[];
  forbiddenTools: string[];
  outputFile: string;
  successPattern?: RegExp;
}

export interface PhaseResult {
  phase: string;
  success: boolean;
  outputFile: string;
  duration: number;
  output: string;
  violations: string[];
}

export class PhaseController extends EventEmitter {
  public phases: Record<string, PhaseConfig> = {
    research: {
      duration: 3,
      allowedTools: ['grep', 'find', 'read', 'ls'],
      forbiddenTools: ['write', 'mkdir', 'rm'],
      outputFile: 'research-findings.md',
      successPattern: /research.+findings/i
    },
    planning: {
      duration: 3,
      allowedTools: ['read'],
      forbiddenTools: ['write', 'grep', 'find'],
      outputFile: 'task-plan.json',
      successPattern: /task.+plan/i
    },
    execution: {
      duration: 10,
      allowedTools: ['write', 'mkdir'],
      forbiddenTools: ['read', 'grep', 'find', 'ls'],
      outputFile: 'implementation/*',
      successPattern: /file.+created|created.+file/i
    },
    integration: {
      duration: 3,
      allowedTools: ['read', 'write', 'edit'],
      forbiddenTools: ['grep', 'find'],
      outputFile: 'integrated-solution.ts',
      successPattern: /integrated|complete/i
    }
  };
  
  constructor(private workspaceBase: string) {
    super();
  }
  
  async executeFullCycle(prompt: string): Promise<Record<string, PhaseResult>> {
    const results: Record<string, PhaseResult> = {};
    
    // Execute phases in sequence
    const phaseOrder = ['research', 'planning', 'execution', 'integration'];
    let currentInput = prompt;
    
    for (const phase of phaseOrder) {
      this.emit('cycleProgress', { phase, total: phaseOrder.length });
      
      try {
        const result = await this.executePhase(phase as any, currentInput);
        results[phase] = result;
        
        // Prepare input for next phase
        if (phase === 'research') {
          currentInput = result.outputFile;
        } else if (phase === 'planning') {
          // Read the plan for execution phase
          try {
            const planPath = path.join(this.workspaceBase, 'planning', result.outputFile);
            const plan = await fs.readFile(planPath, 'utf-8');
            currentInput = plan;
          } catch (e) {
            currentInput = prompt; // Fallback
          }
        }
      } catch (error: any) {
        results[phase] = {
          phase,
          success: false,
          outputFile: '',
          duration: 0,
          output: error.message,
          violations: []
        };
        this.emit('phaseError', { phase, error: error.message });
      }
    }
    
    return results;
  }
  
  async executePhase(phase: keyof typeof PhaseController.prototype.phases, input: string): Promise<PhaseResult> {
    const config = this.phases[phase];
    const workspace = path.join(this.workspaceBase, phase);
    
    // Ensure workspace exists
    await fs.mkdir(workspace, { recursive: true });
    
    this.emit('phaseStart', { phase, config });
    
    const startTime = Date.now();
    const output: string[] = [];
    const violations: string[] = [];
    
    // Spawn Claude with restricted environment
    const claude = spawn('claude', [], {
      name: 'xterm-color',
      cols: 120,
      rows: 40,
      cwd: workspace,
      env: {
        ...process.env,
        AXIOM_V5_PHASE: phase,
        AXIOM_V5_ALLOWED_TOOLS: config.allowedTools.join(','),
        AXIOM_V5_FORBIDDEN_TOOLS: config.forbiddenTools.join(',')
      } as any
    });
    
    // Set up timeout
    const timeout = setTimeout(() => {
      this.emit('phaseTimeout', { phase });
      claude.write('\x1b'); // ESC to interrupt
      setTimeout(() => claude.kill(), 1000);
    }, config.duration * 60 * 1000);
    
    // Monitor output
    claude.onData((data: string) => {
      output.push(data);
      const fullOutput = output.join('');
      
      // Check for violations
      for (const tool of config.forbiddenTools) {
        if (data.includes(tool) || data.includes(`${tool}(`)) {
          const violation = `Attempted to use forbidden tool: ${tool}`;
          violations.push(violation);
          this.emit('violation', { phase, type: 'forbidden_tool', tool, output: fullOutput });
          
          // Interrupt immediately
          claude.write('\x1b');
          claude.write(`\n[VIOLATION] You cannot use ${tool} in ${phase} phase!\n`);
        }
      }
      
      // Check for phase-specific violations
      if (phase === 'execution' && (data.includes('I would') || data.includes('Let me'))) {
        violations.push('Planning detected in execution phase');
        this.emit('violation', { phase, type: 'planning_in_execution', output: fullOutput });
        claude.write('\x1b');
        claude.write('\n[INTERVENTION] Stop planning! Create the files NOW!\n');
      }
      
      // Emit progress
      if (Date.now() - startTime > (config.duration * 60 * 1000 * 0.8)) {
        this.emit('phaseWarning', { phase, message: 'Running out of time!' });
      }
    });
    
    // Wait for Claude to be ready
    await this.waitForReady(claude, output);
    
    // Send the prompt
    await this.sendPrompt(claude, this.createPhasePrompt(phase, input));
    
    // Wait for completion or timeout
    await new Promise<void>((resolve) => {
      claude.onExit(() => {
        clearTimeout(timeout);
        resolve();
      });
      
      // Also check for output file creation
      const checkInterval = setInterval(async () => {
        try {
          const outputPath = path.join(workspace, config.outputFile);
          if (outputPath.includes('*')) {
            // Check for any files in directory
            const dir = path.dirname(outputPath);
            const files = await fs.readdir(dir).catch(() => []);
            if (files.length > 0) {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              claude.kill();
              resolve();
            }
          } else {
            // Check for specific file
            await fs.access(outputPath);
            clearInterval(checkInterval);
            clearTimeout(timeout);
            claude.kill();
            resolve();
          }
        } catch (e) {
          // File doesn't exist yet
        }
      }, 1000);
    });
    
    const duration = Date.now() - startTime;
    const fullOutput = output.join('');
    const success = config.successPattern ? config.successPattern.test(fullOutput) : true;
    
    const result: PhaseResult = {
      phase,
      success,
      outputFile: config.outputFile,
      duration,
      output: fullOutput,
      violations
    };
    
    this.emit('phaseComplete', { phase, result });
    
    return result;
  }
  
  private async waitForReady(claude: IPty, output: string[]): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = () => {
        const out = output.join('');
        if (out.includes('│ >') || out.includes('>>>')) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }
  
  private async sendPrompt(claude: IPty, prompt: string): Promise<void> {
    // Type character by character
    for (const char of prompt) {
      claude.write(char);
      await new Promise(r => setTimeout(r, 50));
    }
    // Submit
    claude.write('\x0d'); // Ctrl+Enter
  }
  
  private createPhasePrompt(phase: string, input: string): string {
    // Phase-specific prompts defined in the class
    return input;
  }
}

export function createPhaseController(workspaceBase: string): PhaseController {
  return new PhaseController(workspaceBase);
}