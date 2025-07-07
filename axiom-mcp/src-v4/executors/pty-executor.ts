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
      
      logger.info('PtyExecutor', 'execute', 'PTY created, setting up handlers', { taskId });
      
      // Handle data with hook integration
      this.pty.onData(async (data: string) => {
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
      this.pty.onExit((exitCode) => {
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
      const claudeCommand = `claude "${prompt.replace(/"/g, '\\"')}"\n`;
      
      logger.info('PtyExecutor', 'execute', 'Executing claude command', { 
        taskId,
        commandLength: claudeCommand.length,
        commandPreview: claudeCommand.slice(0, 100) 
      });
      
      logDebug('PTY', 'Writing claude command to PTY', {
        command: claudeCommand.slice(0, 200)
      });
      
      this.pty.write(claudeCommand);
      
      logDebug('PTY', 'Claude command written, streaming output...');
      
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
    // Send periodic newline to keep PTY alive
    this.heartbeat = setInterval(() => {
      if (!this.isComplete && this.pty) {
        logDebug('PTY', 'Heartbeat - sending newline to keep PTY alive');
        this.pty.write('\n');
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