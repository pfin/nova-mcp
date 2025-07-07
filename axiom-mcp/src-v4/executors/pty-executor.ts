import { spawn, IPty } from 'node-pty';
import { EventEmitter } from 'events';
import * as os from 'os';
import { HookOrchestrator, HookEvent } from '../core/hook-orchestrator.js';
import { Logger } from '../core/logger.js';
import { logDebug } from '../core/simple-logger.js';

const logger = Logger.getInstance();

export interface ExecutorOptions {
  shell?: string;
  cwd?: string;
  env?: Record<string, string>;
  enableMonitoring?: boolean;
  hookOrchestrator?: HookOrchestrator;
}

export class PtyExecutor extends EventEmitter {
  private pty?: IPty;
  private output: string = '';
  private isComplete: boolean = false;
  private interventionQueue: string[] = [];
  private hookOrchestrator?: HookOrchestrator;
  
  constructor(private options: ExecutorOptions = {}) {
    super();
    this.hookOrchestrator = options.hookOrchestrator;
  }
  
  async execute(
    prompt: string, 
    systemPrompt: string,
    taskId: string,
    streamHandler?: (data: string) => void
  ): Promise<string> {
    logger.info('PtyExecutor', 'execute', 'Starting execution', { 
      taskId, 
      promptLength: prompt.length,
      hasStreamHandler: !!streamHandler 
    });
    
    return new Promise((resolve, reject) => {
      const shell = this.options.shell || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');
      const cwd = this.options.cwd || process.cwd();
      
      logger.debug('PtyExecutor', 'execute', 'Creating PTY instance', { shell, cwd });
      
      // Create PTY instance
      logDebug('PTY', 'About to spawn PTY', { 
        shell, 
        cwd,
        envKeys: Object.keys({...process.env, ...this.options.env})
      });
      
      try {
        this.pty = spawn(shell, [], {
          name: 'xterm-color',
          cols: 120,
          rows: 30,
          cwd,
          env: {
            ...process.env,
            ...this.options.env,
            FORCE_COLOR: '0', // Disable ANSI colors
            PROMPT: prompt,
            SYSTEM_PROMPT: systemPrompt,
            TASK_ID: taskId
          } as any
        });
        
        logDebug('PTY', 'PTY spawned successfully', { 
          pid: this.pty.pid,
          process: this.pty.process
        });
      } catch (error) {
        logDebug('PTY', 'FAILED to spawn PTY', { 
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined
        });
        reject(error);
        return;
      }
      
      logger.info('PtyExecutor', 'execute', 'PTY created, setting up handlers', { taskId });
      
      // Verify PTY is really alive
      logDebug('PTY', 'Verifying PTY is alive', {
        pid: this.pty.pid,
        cols: this.pty.cols,
        rows: this.pty.rows
      });
      
      // Setup onData handler first
      logDebug('PTY', 'Setting up onData handler');
      let dataHandlerSet = false;
      
      // Handle data with hook integration
      this.pty.onData(async (data: string) => {
        if (!dataHandlerSet) {
          dataHandlerSet = true;
          logDebug('PTY', 'First onData event received!');
        }
        
        logDebug('PTY', `onData called - received ${data.length} bytes`, {
          taskId,
          preview: data.slice(0, 200).replace(/\n/g, '\\n').replace(/\r/g, '\\r')
        });
        
        logger.trace('PtyExecutor', 'onData', 'Received data', { 
          taskId,
          dataLength: data.length,
          preview: data.slice(0, 100).replace(/\n/g, '\\n')
        });
        
        this.output += data;
        
        // v4: Process stream through hooks
        if (this.hookOrchestrator) {
          const result = await this.hookOrchestrator.triggerHooks(HookEvent.EXECUTION_STREAM, {
            stream: { data, source: taskId },
            execution: { taskId, status: 'running' }
          });
          
          // Check for interventions
          if (result.modifications?.command) {
            this.injectCommand(result.modifications.command);
          }
        }
        
        // Call stream handler
        if (streamHandler) {
          streamHandler(data);
        }
        
        // Emit for other listeners
        this.emit('data', data);
        
        // Check for process idle
        this.resetIdleTimer();
      });
      
      // Handle exit
      logDebug('PTY', 'Setting up onExit handler');
      this.pty.onExit((exitCode) => {
        logDebug('PTY', 'onExit triggered', { exitCode });
        logger.info('PtyExecutor', 'onExit', 'PTY process exited', { 
          taskId,
          exitCode: exitCode.exitCode,
          outputLength: this.output.length 
        });
        
        this.isComplete = true;
        
        if (exitCode.exitCode === 0) {
          resolve(this.output);
        } else {
          reject(new Error(`Process exited with code ${exitCode.exitCode}`));
        }
      });
      
      // v4: Notify hooks of execution start
      if (this.hookOrchestrator) {
        logger.debug('PtyExecutor', 'execute', 'Triggering execution started hooks', { taskId });
        this.hookOrchestrator.triggerHooks(HookEvent.EXECUTION_STARTED, {
          execution: { taskId, status: 'running' },
          request: { tool: 'pty_executor', args: { prompt, systemPrompt } }
        });
      }
      
      // Execute claude command with the prompt
      // NOTE: We use interactive mode, NOT --print (which cannot be course-corrected)
      const claudeCommand = `claude "${prompt.replace(/"/g, '\\"')}"\n`;
      
      logger.info('PtyExecutor', 'execute', 'Executing claude command', { 
        taskId,
        commandLength: claudeCommand.length,
        commandPreview: claudeCommand.slice(0, 100) 
      });
      
      logDebug('PTY', 'Writing claude command to PTY', {
        command: claudeCommand.slice(0, 200),
        ptyPid: this.pty.pid,
        ptyIsAlive: this.pty.pid !== undefined
      });
      
      // CRITICAL DEBUG: Add test to see if PTY is even working
      logDebug('PTY', 'DEBUG MODE: Testing with simple commands first');
      
      // First test if PTY is responsive
      logDebug('PTY', 'Testing PTY responsiveness with echo');
      this.pty.write('echo "PTY_TEST_OK"\n');
      
      // Small delay to see if we get echo response
      setTimeout(() => {
        if (this.output.length === 0) {
          logDebug('PTY', 'WARNING: No response from echo test - PTY may be unresponsive');
        } else {
          logDebug('PTY', 'Echo test successful, output so far:', {
            outputLength: this.output.length,
            preview: this.output.slice(0, 100)
          });
        }
        
        // Check if claude is available
        logDebug('PTY', 'Checking claude availability');
        if (this.pty) this.pty.write('which claude\n');
        
        // Another delay then write actual command
        setTimeout(() => {
          logDebug('PTY', 'Now writing actual claude command');
          if (this.pty) {
            this.pty.write(claudeCommand);
            logDebug('PTY', 'Claude command written to PTY buffer');
            
            // Add immediate check
            setTimeout(() => {
              logDebug('PTY', 'Post-command status check', {
                outputLength: this.output.length,
                isComplete: this.isComplete,
                ptyAlive: !!this.pty
              });
            }, 500);
          } else {
            logDebug('PTY', 'ERROR: PTY is undefined, cannot write command');
          }
        }, 200);
      }, 200);
      
      logDebug('PTY', 'Commands queued for execution');
      
      logger.debug('PtyExecutor', 'execute', 'Command written, starting heartbeat', { taskId });
      
      // Send heartbeat to prevent hanging
      this.startHeartbeat();
      
      // Add early detection of no output
      setTimeout(() => {
        if (this.output.length === 0) {
          logDebug('PTY', 'WARNING: No output after 2s - checking PTY status');
          if (this.pty) this.pty.write('echo "PTY alive"\n');
        }
      }, 2000);
      
      setTimeout(() => {
        if (this.output.length === 0) {
          logDebug('PTY', 'ERROR: No output after 5s - PTY may be stuck', {
            taskId,
            isComplete: this.isComplete
          });
          // Try to get some output
          if (this.pty) this.pty.write('echo "PTY TEST"\n');
        }
      }, 5000);
    });
  }
  
  private idleTimer?: NodeJS.Timeout;
  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    
    // Consider process idle after 30 seconds of no output
    this.idleTimer = setTimeout(() => {
      if (!this.isComplete) {
        logger.warn('PtyExecutor', 'checkIdleTimeout', 'Process appears idle, sending interrupt');
        logDebug('PTY', 'IDLE TIMEOUT - Process hasn\'t produced output for 30s, interrupting');
        this.interrupt();
      }
    }, 30000);
  }
  
  private heartbeat?: NodeJS.Timeout;
  private startHeartbeat(): void {
    logDebug('PTY', 'Starting heartbeat timer (10s intervals)');
    let heartbeatCount = 0;
    // Send periodic newline to keep PTY alive
    this.heartbeat = setInterval(() => {
      heartbeatCount++;
      if (!this.isComplete && this.pty) {
        logDebug('PTY', `Heartbeat #${heartbeatCount} - sending newline to keep PTY alive`, {
          isComplete: this.isComplete,
          ptyPid: this.pty.pid,
          outputLength: this.output.length,
          outputPreview: this.output.slice(-100)
        });
        this.pty.write('\n');
      } else {
        logDebug('PTY', `Heartbeat #${heartbeatCount} - skipped`, {
          isComplete: this.isComplete,
          hasPty: !!this.pty
        });
      }
    }, 10000);
  }
  
  injectCommand(command: string): void {
    if (this.pty && !this.isComplete) {
      logger.info('PtyExecutor', 'injectCommand', `Injecting command: ${command.trim()}`);
      this.pty.write(command);
      
      // v4: Log intervention
      if (this.hookOrchestrator) {
        this.hookOrchestrator.triggerHooks(HookEvent.EXECUTION_INTERVENTION, {
          execution: { taskId: 'current', status: 'running' },
          metadata: { command }
        });
      }
    }
  }
  
  write(data: string): void {
    if (this.pty && !this.isComplete) {
      this.pty.write(data);
    }
  }
  
  interrupt(): void {
    if (this.pty && !this.isComplete) {
      this.pty.write('\x03'); // Ctrl+C
    }
  }
  
  kill(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
    }
    
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    
    if (this.pty) {
      this.pty.kill();
      this.isComplete = true;
    }
  }
  
  getOutput(): string {
    return this.output;
  }
  
  isRunning(): boolean {
    return !this.isComplete && this.pty !== undefined;
  }
}