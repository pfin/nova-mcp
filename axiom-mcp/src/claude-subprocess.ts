import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { getCompleteSystemPrompt } from './base-system-prompt.js';
import { SystemVerification, VerificationProof } from './system-verification.js';

const execAsync = promisify(exec);

export interface ClaudeCodeOptions {
  model?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  addDir?: string[];
  timeout?: number;
  systemPrompt?: string;
  taskType?: string;
  includeDate?: boolean;
  requireImplementation?: boolean;  // Enable system verification
}

export interface ClaudeCodeResult {
  id: string;
  prompt: string;
  response: string;
  error?: string;
  duration: number;
  timestamp: Date;
  startTime: string;
  endTime: string;
  taskType?: string;
  verification?: VerificationProof;  // System verification results
  verificationReport?: string;       // Human-readable report
}

export class ClaudeCodeSubprocess {
  private defaultOptions: ClaudeCodeOptions = {
    timeout: 600000, // 10 minutes default
  };

  constructor(private options: ClaudeCodeOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Execute a prompt using claude -p
   * Using execSync for more reliable execution
   */
  async execute(prompt: string, customOptions?: ClaudeCodeOptions): Promise<ClaudeCodeResult> {
    const startTime = Date.now();
    const id = uuidv4();
    const options = { ...this.options, ...customOptions };

    // Get bash date at start
    const startDateResult = execSync('date', { encoding: 'utf-8' }).trim();

    // Add timestamp to help track long-running operations
    console.error(`[${new Date().toISOString()}] Starting Claude Code task ${id}`);
    console.error(`[TEMPORAL] Task start: ${startDateResult}`);

    // Build the prompt with complete system prompt (base + task-specific)
    const completeSystemPrompt = getCompleteSystemPrompt(options.systemPrompt, options.taskType);
    let fullPrompt = `${completeSystemPrompt}\n\n${prompt}`;
    
    // Note: Temporal instruction is already included in BASE_SYSTEM_PROMPT
    // No need to add it separately anymore

    // Build command with permission bypass
    let cmd = 'claude --dangerously-skip-permissions -p';

    // Add model if specified
    if (options.model) {
      cmd += ` --model ${options.model}`;
    }

    // Add allowed tools
    if (options.allowedTools && options.allowedTools.length > 0) {
      cmd += ` --allowedTools "${options.allowedTools.join(',')}"`;
    }

    // Add disallowed tools
    if (options.disallowedTools && options.disallowedTools.length > 0) {
      cmd += ` --disallowedTools "${options.disallowedTools.join(',')}"`;
    }

    // Add directories
    if (options.addDir && options.addDir.length > 0) {
      options.addDir.forEach(dir => {
        cmd += ` --add-dir "${dir}"`;
      });
    }

    // Add the prompt - properly escape it
    const escapedPrompt = fullPrompt.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
    cmd += ` "${escapedPrompt}"`;

    console.error(`Executing: ${cmd}`);

    // Initialize system verification if required
    let verification: SystemVerification | null = null;
    if (options.requireImplementation) {
      verification = new SystemVerification();
      console.error(`[VERIFICATION] System-level verification enabled for task ${id}`);
    }

    try {
      // Use execSync which seems to work better with claude
      const stdout = execSync(cmd, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: options.timeout || 600000,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      // Get bash date at end
      const endDateResult = execSync('date', { encoding: 'utf-8' }).trim();
      
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] Task ${id} completed in ${duration}ms`);
      console.error(`[TEMPORAL] Task end: ${endDateResult}`);

      const result: ClaudeCodeResult = {
        id,
        prompt,
        response: stdout.trim(),
        duration,
        timestamp: new Date(),
        startTime: startDateResult,
        endTime: endDateResult,
        taskType: options.taskType,
      };

      // Perform system verification if enabled
      if (verification) {
        const proof = verification.gatherProof();
        result.verification = proof;
        result.verificationReport = verification.createReport(proof);
        
        console.error(`[VERIFICATION] Implementation: ${proof.hasImplementation}, Tests: ${proof.hasTests}, Pass: ${proof.testsPass}`);
        
        // Enforce verification requirements
        if (options.requireImplementation && !proof.hasImplementation) {
          throw new Error(`Verification Failed: No implementation detected\n${result.verificationReport}`);
        }
      }

      return result;
    } catch (error: any) {
      // Get bash date at end even for errors
      const endDateResult = execSync('date', { encoding: 'utf-8' }).trim();
      
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] Task ${id} failed after ${duration}ms`);
      console.error(`[TEMPORAL] Task end (error): ${endDateResult}`);

      // Handle timeout
      if (error.signal === 'SIGTERM') {
        return {
          id,
          prompt,
          response: error.stdout?.toString() || '',
          error: `Process timed out after ${options.timeout}ms`,
          duration,
          timestamp: new Date(),
          startTime: startDateResult,
          endTime: endDateResult,
          taskType: options.taskType,
        };
      }

      return {
        id,
        prompt,
        response: error.stdout?.toString() || '',
        error: `Process error: ${error.message}`,
        duration,
        timestamp: new Date(),
        startTime: startDateResult,
        endTime: endDateResult,
        taskType: options.taskType,
      };
    }
  }

  /**
   * Execute a prompt asynchronously using exec (for true parallelism)
   */
  async executeAsync(prompt: string, customOptions?: ClaudeCodeOptions): Promise<ClaudeCodeResult> {
    const startTime = Date.now();
    const id = uuidv4();
    const options = { ...this.options, ...customOptions };

    // Get bash date at start
    const startDateResult = execSync('date', { encoding: 'utf-8' }).trim();

    console.error(`[${new Date().toISOString()}] Starting async Claude Code task ${id}`);
    console.error(`[TEMPORAL] Task start: ${startDateResult}`);

    // Build the prompt with complete system prompt (base + task-specific)
    const completeSystemPrompt = getCompleteSystemPrompt(options.systemPrompt, options.taskType);
    let fullPrompt = `${completeSystemPrompt}\n\n${prompt}`;
    
    // Note: Temporal instruction is already included in BASE_SYSTEM_PROMPT
    // No need to add it separately anymore

    // Build command with permission bypass
    let cmd = 'claude --dangerously-skip-permissions -p';

    if (options.model) {
      cmd += ` --model ${options.model}`;
    }

    if (options.allowedTools && options.allowedTools.length > 0) {
      cmd += ` --allowedTools "${options.allowedTools.join(',')}"`;
    }

    if (options.disallowedTools && options.disallowedTools.length > 0) {
      cmd += ` --disallowedTools "${options.disallowedTools.join(',')}"`;
    }

    if (options.addDir && options.addDir.length > 0) {
      options.addDir.forEach(dir => {
        cmd += ` --add-dir "${dir}"`;
      });
    }

    const escapedPrompt = fullPrompt.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
    cmd += ` "${escapedPrompt}"`;

    try {
      const { stdout, stderr } = await execAsync(cmd, {
        encoding: 'utf-8',
        timeout: options.timeout || 600000,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      // Get bash date at end
      const endDateResult = execSync('date', { encoding: 'utf-8' }).trim();

      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] Async task ${id} completed in ${duration}ms`);
      console.error(`[TEMPORAL] Task end: ${endDateResult}`);

      if (stderr) {
        console.error(`Task ${id} stderr: ${stderr}`);
      }

      return {
        id,
        prompt,
        response: stdout.trim(),
        duration,
        timestamp: new Date(),
        startTime: startDateResult,
        endTime: endDateResult,
        taskType: options.taskType,
      };
    } catch (error: any) {
      // Get bash date at end even for errors
      const endDateResult = execSync('date', { encoding: 'utf-8' }).trim();
      
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] Async task ${id} failed after ${duration}ms`);
      console.error(`[TEMPORAL] Task end (error): ${endDateResult}`);

      return {
        id,
        prompt,
        response: error.stdout || '',
        error: `Process error: ${error.message}`,
        duration,
        timestamp: new Date(),
        startTime: startDateResult,
        endTime: endDateResult,
        taskType: options.taskType,
      };
    }
  }

  /**
   * Execute multiple prompts in parallel
   * Uses async execution for true parallelism
   */
  async executeParallel(
    prompts: { id: string; prompt: string; options?: ClaudeCodeOptions }[]
  ): Promise<ClaudeCodeResult[]> {
    console.error(`[${new Date().toISOString()}] Starting ${prompts.length} parallel tasks`);
    
    // Create promises that will execute in parallel
    const promises = prompts.map(({ id, prompt, options }) => 
      this.executeAsync(prompt, options).then(result => ({ ...result, id }))
    );
    
    return Promise.all(promises);
  }
}