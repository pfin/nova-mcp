/**
 * Claude Interactive Controller with Verbose Mode
 * 
 * Enhanced version that streams real-time status updates for observation
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { SystemVerification } from './system-verification.js';
import { globalMonitor } from './implementation-monitor.js';

export interface VerboseInteractiveOptions {
  maxInteractions?: number;
  timeout?: number;
  onOutput?: (event: OutputEvent) => void;
  onVerification?: (event: VerificationEvent) => void;
  verbose?: boolean;
  verbosePrefix?: string;
}

export interface OutputEvent {
  type: 'output' | 'error' | 'status' | 'verbose';
  content: string;
  timestamp: Date;
}

export interface VerificationEvent {
  filesCreated: number;
  testsRun: number;
  testsPassed: boolean;
  hasImplementation: boolean;
}

export class VerboseInteractiveController extends EventEmitter {
  private sessions: Map<string, ChildProcess> = new Map();
  private verifiers: Map<string, SystemVerification> = new Map();
  private outputBuffers: Map<string, string> = new Map();
  private lastPrompts: Map<string, string> = new Map();
  private verbose: boolean = false;
  private verbosePrefix: string = '[VERBOSE]';
  
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
    /I would\s+(create|implement|write)/i,
    /Here's how you could/i,
    /You can\s+(create|implement|write)/i,
    /To\s+(create|implement|write)/i,
    /Once I have permission/i,
  ];
  
  private log(message: string, sessionId?: string) {
    if (this.verbose) {
      const timestamp = new Date().toISOString();
      const sessionInfo = sessionId ? ` [Session: ${sessionId.substring(0, 8)}]` : '';
      console.log(`${this.verbosePrefix} ${timestamp}${sessionInfo} ${message}`);
    }
  }
  
  createSession(taskId: string, verbose: boolean = false): InteractiveSession {
    this.verbose = verbose;
    
    this.log(`Creating new interactive session for task: ${taskId}`);
    
    const sessionId = uuidv4();
    const verification = new SystemVerification();
    
    this.log(`Spawning Claude process in interactive mode (no -p flag)`);
    
    // Launch Claude in interactive mode with permission bypass
    const proc = spawn('claude', ['--dangerously-skip-permissions'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    
    this.log(`Process spawned with PID: ${proc.pid}`);
    
    this.sessions.set(sessionId, proc);
    this.verifiers.set(sessionId, verification);
    this.outputBuffers.set(sessionId, '');
    
    // Create session object
    const session: InteractiveSession = Object.assign(new EventEmitter(), {
      id: sessionId,
      startTime: new Date(),
      
      send: (prompt: string) => {
        this.log(`Sending prompt: "${prompt.substring(0, 100)}..."`, sessionId);
        this.lastPrompts.set(sessionId, prompt);
        proc.stdin.write(prompt + '\n');
        
        // Emit verbose event
        session.emit('output', {
          type: 'verbose',
          content: `SENT: ${prompt}`,
          timestamp: new Date()
        } as OutputEvent);
      },
      
      close: () => {
        this.log(`Closing session`, sessionId);
        proc.kill();
        this.sessions.delete(sessionId);
        this.verifiers.delete(sessionId);
        this.outputBuffers.delete(sessionId);
        this.lastPrompts.delete(sessionId);
        session.emit('close');
      }
    });
    
    // Monitor stdout
    proc.stdout?.on('data', (data) => {
      const chunk = data.toString();
      const buffer = this.outputBuffers.get(sessionId) || '';
      
      this.log(`Received ${chunk.length} bytes of output`, sessionId);
      
      // Emit output event
      session.emit('output', {
        type: 'output',
        content: chunk,
        timestamp: new Date()
      } as OutputEvent);
      
      // Check if Claude seems done with current response
      if (this.isResponseComplete(buffer + chunk)) {
        this.log(`Response appears complete, analyzing...`, sessionId);
        this.analyzeAndRespond(sessionId, session, taskId);
      }
      
      this.outputBuffers.set(sessionId, buffer + chunk);
    });
    
    // Monitor stderr
    proc.stderr?.on('data', (data) => {
      const error = data.toString();
      this.log(`ERROR: ${error}`, sessionId);
      
      session.emit('output', {
        type: 'error',
        content: error,
        timestamp: new Date()
      } as OutputEvent);
    });
    
    // Handle process exit
    proc.on('exit', (code) => {
      this.log(`Process exited with code: ${code}`, sessionId);
      session.emit('close');
    });
    
    // Send initial task
    setTimeout(() => {
      const initialPrompt = `
CRITICAL: You MUST write actual code files, not just describe what you would do.

Task: ${taskId}

Use these tools:
- Write: Create files with actual code
- Bash: Run commands to test your implementation
- Read: Read existing files

Start implementing NOW. Don't ask for permission, just do it.
`;
      this.log(`Sending initial task prompt`, sessionId);
      session.send(initialPrompt);
    }, 1000);
    
    return session;
  }
  
  private isResponseComplete(buffer: string): boolean {
    // Check if any completion pattern is found
    return this.COMPLETION_PATTERNS.some(pattern => pattern.test(buffer));
  }
  
  private analyzeAndRespond(sessionId: string, session: InteractiveSession, taskId: string) {
    this.log(`Analyzing Claude's response and system state`, sessionId);
    
    const verifier = this.verifiers.get(sessionId);
    if (!verifier) return;
    
    const buffer = this.outputBuffers.get(sessionId) || '';
    const lastPrompt = this.lastPrompts.get(sessionId) || '';
    
    // Gather system verification proof
    const proof = verifier.gatherProof();
    
    this.log(`Verification results: Files=${proof.filesCreated.length}, Tests=${proof.processesRun.length}, HasImpl=${proof.hasImplementation}`, sessionId);
    
    // Emit verification event
    session.emit('verification', {
      filesCreated: proof.filesCreated.length,
      testsRun: proof.processesRun.length,
      testsPassed: proof.testsPass,
      hasImplementation: proof.hasImplementation
    } as VerificationEvent);
    
    // Check patterns in response
    const hasNoImplementationPatterns = this.NO_IMPLEMENTATION_PATTERNS.some(p => p.test(buffer));
    const mentionedWriteTool = /Write\s*\(/i.test(buffer);
    const mentionedBashTool = /Bash\s*\(/i.test(buffer);
    
    this.log(`Response analysis: NoImpl=${hasNoImplementationPatterns}, Write=${mentionedWriteTool}, Bash=${mentionedBashTool}`, sessionId);
    
    // Decide on follow-up action
    if (!proof.hasImplementation && hasNoImplementationPatterns) {
      const prompt = `STOP. You're describing what to do instead of doing it.
Use the Write tool RIGHT NOW to create the files.
Don't explain, just write: Write('filename.py', '''actual code here''')`;
      
      this.log(`Sending correction: Force implementation`, sessionId);
      session.send(prompt);
      
    } else if (!proof.hasImplementation && !mentionedWriteTool) {
      const prompt = `You haven't created any files yet. Use the Write tool:
Write('calculator.py', '''class Calculator: ...''')
Do it now.`;
      
      this.log(`Sending hint: How to use Write tool`, sessionId);
      session.send(prompt);
      
    } else if (proof.hasImplementation && !proof.testsPass && !mentionedBashTool) {
      const prompt = `Good, files created. Now run the tests with Bash tool:
Bash('python -m pytest test_*.py -v')
Show me the test results.`;
      
      this.log(`Sending next step: Run tests`, sessionId);
      session.send(prompt);
      
    } else if (proof.hasImplementation && proof.processesRun.length > 0 && !proof.testsPass) {
      const lastTest = proof.processesRun[proof.processesRun.length - 1];
      const prompt = `Tests failed. Here's the error:
${lastTest.stderr}

Fix the code and run tests again.`;
      
      this.log(`Sending error feedback: Tests failed`, sessionId);
      session.send(prompt);
      
    } else if (proof.hasImplementation && proof.testsPass) {
      this.log(`SUCCESS! Implementation complete with passing tests`, sessionId);
      
      session.emit('status', {
        type: 'status',
        content: 'Implementation complete with passing tests!',
        timestamp: new Date()
      } as OutputEvent);
      
      // Close session after success
      setTimeout(() => session.close(), 1000);
      
    } else {
      const prompt = `Status check:
- Files created: ${proof.filesCreated.length}
- Tests run: ${proof.processesRun.length}
- Tests passing: ${proof.testsPass}

What's your next step?`;
      
      this.log(`Sending generic status check`, sessionId);
      session.send(prompt);
    }
    
    // Clear buffer for next response
    this.outputBuffers.set(sessionId, '');
  }
  
  /**
   * Run an implementation task with verbose monitoring
   */
  async runImplementationTask(
    task: string,
    options: VerboseInteractiveOptions = {}
  ): Promise<{
    success: boolean;
    interactions: number;
    finalVerification: VerificationEvent;
    sessionId: string;
  }> {
    const maxInteractions = options.maxInteractions || 10;
    const timeout = options.timeout || 600000; // 10 minutes
    const taskId = uuidv4();
    this.verbose = options.verbose || false;
    this.verbosePrefix = options.verbosePrefix || '[VERBOSE]';
    
    this.log(`Starting implementation task: "${task}"`);
    this.log(`Max interactions: ${maxInteractions}, Timeout: ${timeout}ms`);
    
    return new Promise((resolve, reject) => {
      const session = this.createSession(taskId, this.verbose);
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
        this.log(`Interaction ${interactions}/${maxInteractions}: Implementation=${event.hasImplementation}, Tests=${event.testsPassed}`);
        
        // Check if we're done
        if (event.hasImplementation && event.testsPassed) {
          this.log(`SUCCESS after ${interactions} interactions!`);
          clearTimeout(timeoutId);
          resolve({
            success: true,
            interactions,
            finalVerification: event,
            sessionId: session.id
          });
        } else if (interactions >= maxInteractions) {
          this.log(`FAILED: Max interactions (${maxInteractions}) reached`);
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
        this.log(`Session closed`);
        clearTimeout(timeoutId);
      });
      
      // Set timeout
      timeoutId = setTimeout(() => {
        this.log(`TIMEOUT: ${timeout}ms exceeded`);
        session.close();
        reject(new Error(`Task timed out after ${timeout}ms`));
      }, timeout);
      
      // Send the actual task
      setTimeout(() => {
        this.log(`Sending main task: "${task}"`);
        session.send(task);
      }, 2000);
    });
  }
}

// Export singleton instance
export const verboseController = new VerboseInteractiveController();

// Also export the original interface names for compatibility
export interface InteractiveSession extends EventEmitter {
  send(prompt: string): void;
  close(): void;
  id: string;
  startTime: Date;
}