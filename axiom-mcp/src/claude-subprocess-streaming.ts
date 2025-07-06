import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { streamManager, StreamUpdate } from './stream-manager.js';

export interface StreamingExecuteOptions {
  timeout?: number;
  maxRetries?: number;
  workingDirectory?: string;
  env?: Record<string, string>;
  streamToParent?: boolean;
  parentTaskId?: string;
  taskPath?: string[];
}

export interface StreamingExecuteResult {
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  retries: number;
  streamId: string;
}

export class ClaudeCodeSubprocessStreaming {
  private defaultTimeout: number;
  private currentProcesses: Map<string, ChildProcess> = new Map();
  
  constructor(options: { timeout?: number } = {}) {
    this.defaultTimeout = options.timeout || 600000; // 10 minutes default
  }

  async execute(
    prompt: string, 
    taskId: string,
    options: StreamingExecuteOptions = {}
  ): Promise<StreamingExecuteResult> {
    const startTime = Date.now();
    const timeout = options.timeout || this.defaultTimeout;
    const maxRetries = options.maxRetries || 0;
    const streamId = uuidv4();
    
    // Create stream channel for this task
    streamManager.createChannel(taskId);
    
    let retries = 0;
    let lastError: Error | null = null;

    // Stream initial status
    this.streamStatus(taskId, 'starting', {
      prompt: prompt.substring(0, 100) + '...',
      parentTaskId: options.parentTaskId,
      path: options.taskPath || []
    }, options.parentTaskId, options.taskPath || []);

    while (retries <= maxRetries) {
      try {
        const result = await this.executeWithStreaming(
          prompt, 
          taskId,
          timeout, 
          streamId,
          options
        );
        
        if (result.success) {
          // Stream completion
          this.streamComplete(taskId, Date.now() - startTime, options.parentTaskId, options.taskPath || []);
          
          return {
            ...result,
            duration: Date.now() - startTime,
            retries,
            streamId
          };
        }
        
        lastError = new Error(result.error || 'Unknown error');
      } catch (error) {
        lastError = error as Error;
        
        // Stream error
        this.streamError(taskId, lastError.message, options.parentTaskId, options.taskPath || []);
      }

      retries++;
      if (retries <= maxRetries) {
        // Stream retry status
        this.streamStatus(taskId, 'retrying', {
          attempt: retries + 1,
          maxRetries: maxRetries + 1,
          lastError: lastError?.message
        }, options.parentTaskId, options.taskPath || []);
        
        await new Promise(resolve => setTimeout(resolve, 2000 * retries));
      }
    }

    throw lastError || new Error('Failed after retries');
  }

  private async executeWithStreaming(
    prompt: string,
    taskId: string,
    timeout: number,
    streamId: string,
    options: StreamingExecuteOptions
  ): Promise<StreamingExecuteResult> {
    return new Promise((resolve, reject) => {
      const isWindows = os.platform() === 'win32';
      const claudeExecutable = isWindows ? 'claude.exe' : 'claude';
      
      const args = ['--no-color'];
      const env = { 
        ...process.env, 
        ...options.env,
        FORCE_COLOR: '0',
        NO_COLOR: '1'
      };

      const proc = spawn(claudeExecutable, args, {
        cwd: options.workingDirectory || process.cwd(),
        env,
        shell: false,
        windowsHide: true
      });

      this.currentProcesses.set(streamId, proc);

      let stdout = '';
      let stderr = '';
      let isComplete = false;
      let buffer = '';
      let lastProgress = 0;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!isComplete) {
          proc.kill('SIGTERM');
          this.streamError(taskId, 'Process timed out', options.parentTaskId, options.taskPath || []);
          reject(new Error(`Process timed out after ${timeout}ms`));
        }
      }, timeout);

      // Handle stdout with streaming
      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        buffer += chunk;
        
        // Stream output chunks in real-time
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            // Detect progress indicators
            const progressMatch = line.match(/(\d+)%/);
            if (progressMatch) {
              const percent = parseInt(progressMatch[1]);
              if (percent > lastProgress) {
                lastProgress = percent;
                this.streamProgress(taskId, percent, line, options.parentTaskId, options.taskPath || []);
              }
            } else {
              // Stream regular output
              this.streamOutput(taskId, line, options.parentTaskId, options.taskPath || []);
            }
          }
        }
      });

      // Handle stderr with streaming
      proc.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        
        // Stream errors immediately
        const lines = chunk.split('\n').filter((line: string) => line.trim());
        for (const line of lines) {
          if (!line.includes('Warning:') && !line.includes('Info:')) {
            this.streamError(taskId, line, options.parentTaskId, options.taskPath || []);
          }
        }
      });

      // Send the prompt after process starts
      proc.stdin?.write(prompt + '\n');
      proc.stdin?.end();

      // Handle process completion
      proc.on('close', (code) => {
        isComplete = true;
        clearTimeout(timeoutId);
        this.currentProcesses.delete(streamId);

        // Flush any remaining buffer
        if (buffer.trim()) {
          this.streamOutput(taskId, buffer, options.parentTaskId, options.taskPath || []);
        }

        if (code === 0) {
          resolve({
            success: true,
            output: stdout,
            error: stderr,
            duration: 0,
            retries: 0,
            streamId
          });
        } else {
          resolve({
            success: false,
            output: stdout,
            error: stderr || `Process exited with code ${code}`,
            duration: 0,
            retries: 0,
            streamId
          });
        }
      });

      proc.on('error', (error) => {
        isComplete = true;
        clearTimeout(timeoutId);
        this.currentProcesses.delete(streamId);
        
        this.streamError(taskId, error.message, options.parentTaskId, options.taskPath || []);
        reject(error);
      });
    });
  }

  // Stream helper methods that propagate to parent
  private streamStatus(taskId: string, status: string, data: any, parentTaskId?: string, path: string[] = []) {
    const update: StreamUpdate = {
      id: uuidv4(),
      taskId,
      parentTaskId,
      level: path.length,
      type: 'status',
      timestamp: new Date(),
      data: { status, ...data },
      source: `Task ${taskId.substring(0, 8)}`,
      path
    };
    
    streamManager.streamUpdate(update);
  }

  private streamProgress(taskId: string, percent: number, message: string, parentTaskId?: string, path: string[] = []) {
    const update: StreamUpdate = {
      id: uuidv4(),
      taskId,
      parentTaskId,
      level: path.length,
      type: 'progress',
      timestamp: new Date(),
      data: { percent, message },
      source: `Task ${taskId.substring(0, 8)}`,
      path
    };
    
    streamManager.streamUpdate(update);
  }

  private streamOutput(taskId: string, output: string, parentTaskId?: string, path: string[] = []) {
    // Truncate long output for preview
    const preview = output.length > 200 ? output.substring(0, 200) + '...' : output;
    
    const update: StreamUpdate = {
      id: uuidv4(),
      taskId,
      parentTaskId,
      level: path.length,
      type: 'output',
      timestamp: new Date(),
      data: { preview, full: output },
      source: `Task ${taskId.substring(0, 8)}`,
      path
    };
    
    streamManager.streamUpdate(update);
  }

  private streamError(taskId: string, error: string, parentTaskId?: string, path: string[] = []) {
    const update: StreamUpdate = {
      id: uuidv4(),
      taskId,
      parentTaskId,
      level: path.length,
      type: 'error',
      timestamp: new Date(),
      data: { error },
      source: `Task ${taskId.substring(0, 8)}`,
      path
    };
    
    streamManager.streamUpdate(update);
  }

  private streamComplete(taskId: string, duration: number, parentTaskId?: string, path: string[] = []) {
    const update: StreamUpdate = {
      id: uuidv4(),
      taskId,
      parentTaskId,
      level: path.length,
      type: 'complete',
      timestamp: new Date(),
      data: { duration },
      source: `Task ${taskId.substring(0, 8)}`,
      path
    };
    
    streamManager.streamUpdate(update);
  }

  // Kill all active processes
  async killAll(): Promise<void> {
    for (const [id, proc] of this.currentProcesses) {
      proc.kill('SIGTERM');
      this.currentProcesses.delete(id);
    }
  }

  // Get active process count
  getActiveCount(): number {
    return this.currentProcesses.size;
  }
}