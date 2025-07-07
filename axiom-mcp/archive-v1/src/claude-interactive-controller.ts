/**
 * Claude Interactive Controller
 * 
 * Instead of using claude -p with a single prompt, this controller:
 * 1. Launches Claude in interactive mode
 * 2. Monitors output in real-time
 * 3. Sends follow-up prompts based on observed behavior
 * 4. Forces implementation through continuous interaction
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { SystemVerification } from './system-verification.js';
import { globalMonitor } from './implementation-monitor.js';

export interface InteractiveSession extends EventEmitter {
  send(prompt: string): void;
  close(): void;
  id: string;
  startTime: Date;
}

export interface OutputEvent {
  type: 'output' | 'error' | 'status';
  content: string;
  timestamp: Date;
}

export interface VerificationEvent {
  filesCreated: number;
  testsRun: number;
  testsPassed: boolean;
  hasImplementation: boolean;
}

export class ClaudeInteractiveController extends EventEmitter {
  private sessions: Map<string, ChildProcess> = new Map();
  private verifiers: Map<string, SystemVerification> = new Map();
  private outputBuffers: Map<string, string> = new Map();
  private lastPrompts: Map<string, string> = new Map();
  
  // Patterns that indicate Claude is waiting or done
  private readonly COMPLETION_PATTERNS = [
    /^>\s*$/m,                    // Just a prompt
    /Would you like me to/i,      // Asking for permission
    /Is there anything else/i,    // Asking if done
    /Let me know if/i,           // Waiting for feedback
    /I've completed/i,           // Claims completion
    /Task complete/i,            // Claims done
  ];
  
  // Patterns that indicate no implementation
  private readonly NO_IMPLEMENTATION_PATTERNS = [
    /would need to/i,
    /you could/i,
    /here's how/i,
    /the implementation would/i,
    /to implement this/i,
    /once I have permission/i,
  ];
  
  /**
   * Create an interactive Claude session with continuous monitoring
   */
  createSession(taskId: string): InteractiveSession {
    const sessionId = uuidv4();
    const verifier = new SystemVerification();
    this.verifiers.set(sessionId, verifier);
    
    // Launch Claude in interactive mode with permission bypass
    const proc = spawn('claude', ['--dangerously-skip-permissions'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    
    this.sessions.set(sessionId, proc);
    this.outputBuffers.set(sessionId, '');
    
    // Create session event emitter
    const session = new EventEmitter() as InteractiveSession;
    session.id = sessionId;
    session.startTime = new Date();
    
    // Monitor stdout
    proc.stdout?.on('data', (data) => {
      const chunk = data.toString();
      const buffer = this.outputBuffers.get(sessionId) || '';
      this.outputBuffers.set(sessionId, buffer + chunk);
      
      // Emit output event
      session.emit('output', {
        type: 'output',
        content: chunk,
        timestamp: new Date()
      } as OutputEvent);
      
      // Check if Claude seems done with current response
      if (this.isResponseComplete(buffer + chunk)) {
        this.analyzeAndRespond(sessionId, session, taskId);
      }
    });
    
    // Monitor stderr
    proc.stderr?.on('data', (data) => {
      session.emit('output', {
        type: 'error',
        content: data.toString(),
        timestamp: new Date()
      } as OutputEvent);
    });
    
    // Session methods
    session.send = (prompt: string) => {
      this.lastPrompts.set(sessionId, prompt);
      proc.stdin?.write(prompt + '\n');
      
      // Clear buffer for new response
      setTimeout(() => {
        this.outputBuffers.set(sessionId, '');
      }, 100);
    };
    
    session.close = () => {
      proc.kill();
      this.sessions.delete(sessionId);
      this.verifiers.delete(sessionId);
      this.outputBuffers.delete(sessionId);
      this.lastPrompts.delete(sessionId);
    };
    
    // Handle process exit
    proc.on('exit', () => {
      session.emit('close');
      session.close();
    });
    
    return session;
  }
  
  /**
   * Check if Claude's response seems complete
   */
  private isResponseComplete(output: string): boolean {
    // Check for completion patterns
    for (const pattern of this.COMPLETION_PATTERNS) {
      if (pattern.test(output)) {
        return true;
      }
    }
    
    // Check if output has been stable for a bit
    const lines = output.split('\n');
    const lastLine = lines[lines.length - 1];
    if (lastLine.trim() === '' && lines.length > 5) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Analyze Claude's output and send appropriate follow-up
   */
  private async analyzeAndRespond(
    sessionId: string, 
    session: InteractiveSession,
    taskId: string
  ) {
    const output = this.outputBuffers.get(sessionId) || '';
    const verifier = this.verifiers.get(sessionId);
    const lastPrompt = this.lastPrompts.get(sessionId) || '';
    
    if (!verifier) return;
    
    // Get current verification state
    const proof = verifier.gatherProof();
    
    // Emit verification event
    session.emit('verification', {
      filesCreated: proof.filesCreated.length,
      testsRun: proof.processesRun.length,
      testsPassed: proof.testsPass,
      hasImplementation: proof.hasImplementation
    } as VerificationEvent);
    
    // Analyze what Claude did (or didn't do)
    const hasNoImplementationPatterns = this.NO_IMPLEMENTATION_PATTERNS.some(p => p.test(output));
    const mentionedWriteTool = /Write tool|use Write|Write to create/i.test(output);
    const mentionedBashTool = /Bash tool|use Bash|run.*test/i.test(output);
    
    // Decision tree for follow-up prompts
    if (!proof.hasImplementation && hasNoImplementationPatterns) {
      // Claude is theorizing instead of implementing
      session.send(
        `STOP. You're describing what to do instead of doing it.\n` +
        `Use the Write tool RIGHT NOW to create the files.\n` +
        `Don't explain, just write: Write('filename.py', '''actual code here''')`
      );
    } else if (!proof.hasImplementation && !mentionedWriteTool) {
      // Claude might not know about Write tool
      session.send(
        `You haven't created any files yet. Use the Write tool:\n` +
        `Write('calculator.py', '''class Calculator: ...''')\n` +
        `Do it now.`
      );
    } else if (proof.hasImplementation && !proof.testsPass && !mentionedBashTool) {
      // Files created but no tests run
      session.send(
        `Good, files created. Now run the tests with Bash tool:\n` +
        `Bash('python -m pytest test_*.py -v')\n` +
        `Show me the test results.`
      );
    } else if (proof.hasImplementation && proof.processesRun.length > 0 && !proof.testsPass) {
      // Tests failed
      const lastTest = proof.processesRun[proof.processesRun.length - 1];
      session.send(
        `Tests failed. Here's the error:\n${lastTest.stderr}\n\n` +
        `Fix the code and run tests again.`
      );
    } else if (proof.hasImplementation && proof.testsPass) {
      // Success!
      session.emit('status', {
        type: 'status',
        content: 'Implementation complete with passing tests!',
        timestamp: new Date()
      } as OutputEvent);
      
      // Close session after success
      setTimeout(() => session.close(), 1000);
    } else {
      // Generic nudge
      session.send(
        `Status check:\n` +
        `- Files created: ${proof.filesCreated.length}\n` +
        `- Tests run: ${proof.processesRun.length}\n` +
        `- Tests passing: ${proof.testsPass}\n\n` +
        `What's your next step?`
      );
    }
    
    // Clear buffer for next response
    this.outputBuffers.set(sessionId, '');
  }
  
  /**
   * Run an implementation task with interactive control
   */
  async runImplementationTask(
    task: string,
    options: {
      maxInteractions?: number;
      timeout?: number;
      onOutput?: (event: OutputEvent) => void;
      onVerification?: (event: VerificationEvent) => void;
    } = {}
  ): Promise<{
    success: boolean;
    interactions: number;
    finalVerification: VerificationEvent;
    sessionId: string;
  }> {
    const maxInteractions = options.maxInteractions || 10;
    const timeout = options.timeout || 600000; // 10 minutes
    const taskId = uuidv4();
    
    return new Promise((resolve, reject) => {
      const session = this.createSession(taskId);
      let interactions = 0;
      let timeoutId: NodeJS.Timeout;
      
      // Set up event handlers
      if (options.onOutput) {
        session.on('output', options.onOutput);
      }
      
      if (options.onVerification) {
        session.on('verification', options.onVerification);
      }
      
      session.on('verification', (event: VerificationEvent) => {
        interactions++;
        
        // Check if we're done
        if (event.hasImplementation && event.testsPassed) {
          clearTimeout(timeoutId);
          resolve({
            success: true,
            interactions,
            finalVerification: event,
            sessionId: session.id
          });
        } else if (interactions >= maxInteractions) {
          clearTimeout(timeoutId);
          session.close();
          resolve({
            success: false,
            interactions,
            finalVerification: event,
            sessionId: session.id
          });
        }
      });
      
      session.on('close', () => {
        clearTimeout(timeoutId);
        const verifier = this.verifiers.get(session.id);
        const proof = verifier?.gatherProof();
        resolve({
          success: proof?.meetsRequirements || false,
          interactions,
          finalVerification: {
            filesCreated: proof?.filesCreated.length || 0,
            testsRun: proof?.processesRun.length || 0,
            testsPassed: proof?.testsPass || false,
            hasImplementation: proof?.hasImplementation || false
          },
          sessionId: session.id
        });
      });
      
      // Set timeout
      timeoutId = setTimeout(() => {
        session.close();
        reject(new Error('Task timed out'));
      }, timeout);
      
      // Send initial prompt with clear instructions
      const initialPrompt = `
SYSTEM: You are in implementation mode. You MUST:
1. Use Write tool to create actual code files
2. Use Bash tool to run tests
3. Fix any errors and iterate until tests pass

I am monitoring your actions in real-time and will guide you.

TASK: ${task}

Start by using Write tool to create the implementation file.`;
      
      session.send(initialPrompt);
    });
  }
}

// Export singleton instance
export const interactiveController = new ClaudeInteractiveController();