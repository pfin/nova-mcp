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

export interface PtyExecutorOptions {
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  heartbeatInterval?: number;
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
  
  constructor(private options: PtyExecutorOptions = {}) {
    super();
  }
  
  async execute(command: string, args: string[], taskId: string): Promise<void> {
    if (this.isRunning) {
      throw new Error('Executor already running');
    }
    
    this.isRunning = true;
    
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
      
      // Stream output character by character
      this.ptyProcess.onData((data) => {
        this.outputBuffer += data;
        this.emit('data', {
          taskId,
          timestamp: Date.now(),
          type: 'data',
          payload: data
        } as ExecutorEvent);
      });
      
      // Start heartbeat to prevent timeout
      this.startHeartbeat(taskId);
      
      // Handle process exit
      this.ptyProcess.onExit(({ exitCode, signal }) => {
        this.stopHeartbeat();
        this.isRunning = false;
        this.emit('exit', {
          taskId,
          timestamp: Date.now(),
          type: 'exit',
          payload: { exitCode, signal }
        } as ExecutorEvent);
      });
      
    } catch (error) {
      this.isRunning = false;
      this.emit('error', {
        taskId,
        timestamp: Date.now(),
        type: 'error',
        payload: error
      } as ExecutorEvent);
      throw error;
    }
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
   * Check if process is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}