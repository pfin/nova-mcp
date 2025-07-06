/**
 * PTY Executor for Claude CLI
 * 
 * Based on expert recommendations from GoodIdeasFromOtherModels.txt:
 * - Uses node-pty to create pseudo-terminal
 * - Implements heartbeat to prevent 30s timeout
 * - Streams output character by character
 * - Allows stdin injection for intervention
 */

import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { createMonitoringPipeline, StreamInterceptor } from '../monitors/stream-interceptor.js';

export interface PtyExecutorOptions {
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  heartbeatInterval?: number;
  enableMonitoring?: boolean;
  enableIntervention?: boolean;
  onExecutorCreated?: (executor: PtyExecutor) => void;
}

export interface ExecutorEvent {
  taskId: string;
  timestamp: number;
  type: 'data' | 'exit' | 'error' | 'heartbeat';
  payload: any;
}

export class PtyExecutor extends EventEmitter {
  private ptyProcess: pty.IPty | null = null;
  private outputBuffer: string = '';
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private streamInterceptor: StreamInterceptor | null = null;
  
  constructor(private options: PtyExecutorOptions = {}) {
    super();
  }
  
  cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
    this.isRunning = false;
  }
  
  async execute(command: string, args: string[], taskId: string): Promise<void> {
    if (this.isRunning) {
      throw new Error('Executor already running');
    }
    
    this.isRunning = true;
    console.error(`[PTY] Starting execution: ${command} ${args.slice(0, 2).join(' ')}...`);
    
    return new Promise<void>((resolve, reject) => {
      try {
        // CRITICAL: Use exact configuration from GoodIdeas
        this.ptyProcess = pty.spawn(command, args, {
          name: 'xterm-color',
          cols: this.options.cols || 120,
          rows: this.options.rows || 40,
          cwd: this.options.cwd || process.cwd(),
          env: { 
            ...process.env, 
            ...this.options.env,
            FORCE_COLOR: '0' // Disable color to avoid ANSI escape sequences
          }
        });
        
        console.error(`[PTY] Process spawned successfully`);
        
        // Set up monitoring pipeline if enabled
        if (this.options.enableMonitoring) {
          this.streamInterceptor = createMonitoringPipeline(
            taskId,
            this.options.enableIntervention ?? true,
            (intervention) => {
              // Inject intervention command into PTY
              console.error(`[INTERVENTION] ${taskId}: ${intervention}`);
              this.write(intervention);
              this.emit('intervention', {
                taskId,
                timestamp: Date.now(),
                type: 'intervention',
                payload: intervention
              });
            }
          );
          
          // Subscribe to violation events
          this.streamInterceptor.onInterceptorEvent('violation', (violation: any) => {
            this.emit('violation', {
              taskId,
              timestamp: Date.now(),
              type: 'violation',
              payload: violation
            });
          });
        }
        
        // Notify if callback provided (for interactive controller)
        if (this.options.onExecutorCreated) {
          this.options.onExecutorCreated(this);
        }
        
        // Stream output character by character
        this.ptyProcess.onData((data) => {
          console.error(`[PTY] Received data: ${data.length} bytes`);
          this.outputBuffer += data;
          
          // Pass through monitoring pipeline if enabled
          if (this.streamInterceptor) {
            this.streamInterceptor.write(data);
          }
          
          this.emit('data', {
            taskId,
            timestamp: Date.now(),
            type: 'data',
            payload: data
          } as ExecutorEvent);
        });
        
        // Start heartbeat to prevent timeout
        this.startHeartbeat(taskId);
        
        // Handle process exit - THIS RESOLVES THE PROMISE
        this.ptyProcess.onExit(({ exitCode, signal }) => {
          console.error(`[PTY] Process exited: exitCode=${exitCode}, signal=${signal}`);
          this.stopHeartbeat();
          this.isRunning = false;
          this.emit('exit', {
            taskId,
            timestamp: Date.now(),
            type: 'exit',
            payload: { exitCode, signal }
          } as ExecutorEvent);
          
          // Resolve the promise when process exits
          resolve();
        });
        
      } catch (error) {
        this.isRunning = false;
        this.emit('error', {
          taskId,
          timestamp: Date.now(),
          type: 'error',
          payload: error
        } as ExecutorEvent);
        reject(error);
      }
    });
  }
  
  /**
   * Write data to the PTY stdin
   * Used for intervention and interaction
   */
  write(data: string): void {
    if (!this.ptyProcess || !this.isRunning) {
      throw new Error('No running process');
    }
    this.ptyProcess.write(data);
  }
  
  /**
   * Start heartbeat to prevent Claude CLI timeout
   * Based on expert recommendation: send zero-width char every 3 minutes
   */
  private startHeartbeat(taskId: string): void {
    const interval = this.options.heartbeatInterval || 180_000; // 3 minutes
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ptyProcess && this.isRunning) {
        // Send zero-width character that won't affect output
        this.ptyProcess.write('\x00');
        this.emit('heartbeat', {
          taskId,
          timestamp: Date.now(),
          type: 'heartbeat',
          payload: 'Sent keepalive'
        } as ExecutorEvent);
      }
    }, interval);
  }
  
  /**
   * Stop the heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  /**
   * Force kill the process
   */
  kill(): void {
    this.stopHeartbeat();
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
    this.isRunning = false;
  }
  
  /**
   * Get the accumulated output buffer
   */
  getOutput(): string {
    return this.outputBuffer;
  }
  
  /**
   * Get violation report if monitoring is enabled
   */
  getViolations(): any[] {
    if (this.streamInterceptor) {
      return this.streamInterceptor.getViolations();
    }
    return [];
  }
  
  /**
   * Force an intervention with a custom message
   */
  forceIntervention(message: string): void {
    if (this.streamInterceptor) {
      this.streamInterceptor.forceIntervention(message);
    }
  }
  
  /**
   * Check if process is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}