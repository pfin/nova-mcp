import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { GeminiConfig, StreamingOptions } from './types/index.js';
import { RateLimiter } from './utils/rate-limiter.js';

export class GeminiStreamingIntegration extends EventEmitter {
  private config: GeminiConfig;
  private rateLimiter: RateLimiter;
  private activeProcess?: ChildProcess;

  constructor(config: Partial<GeminiConfig> = {}) {
    super();
    this.config = {
      enabled: config.enabled ?? (process.env.GEMINI_ENABLED !== 'false'),
      autoConsult: config.autoConsult ?? (process.env.GEMINI_AUTO_CONSULT !== 'false'),
      cliCommand: config.cliCommand ?? process.env.GEMINI_CLI_COMMAND ?? 'gemini',
      timeout: config.timeout ?? parseInt(process.env.GEMINI_TIMEOUT ?? '300'),
      rateLimitDelay: config.rateLimitDelay ?? parseInt(process.env.GEMINI_RATE_LIMIT ?? '2'),
      model: config.model ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-pro',
      maxContext: config.maxContext ?? (process.env.GEMINI_MAX_CONTEXT ? parseInt(process.env.GEMINI_MAX_CONTEXT) : undefined),
      debug: config.debug ?? (process.env.GEMINI_DEBUG === 'true'),
      enableStreaming: config.enableStreaming ?? (process.env.GEMINI_ENABLE_STREAMING !== 'false'),
      enableToolChaining: config.enableToolChaining ?? (process.env.GEMINI_ENABLE_TOOL_CHAINING === 'true'),
      maxRecursionDepth: config.maxRecursionDepth ?? parseInt(process.env.GEMINI_MAX_RECURSION_DEPTH ?? '5'),
    };

    this.rateLimiter = new RateLimiter(this.config.rateLimitDelay);
  }

  async consultGeminiStream(
    query: string,
    context: string | undefined,
    options: StreamingOptions
  ): Promise<void> {
    if (!this.config.enabled) {
      options.onError?.(new Error('Gemini integration is disabled'));
      return;
    }

    if (!this.config.enableStreaming) {
      options.onError?.(new Error('Streaming is disabled'));
      return;
    }

    try {
      // Rate limiting
      await this.rateLimiter.wait();

      // Prepare the full query
      const fullQuery = this.prepareQuery(query, context);

      // Execute streaming command
      await this.executeStreamingCommand(fullQuery, options);
    } catch (error) {
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private prepareQuery(query: string, context?: string): string {
    let fullQuery = query;

    if (context) {
      fullQuery = `Context: ${context}\n\nQuestion: ${query}`;
    }

    // Limit context length if specified
    if (this.config.maxContext && fullQuery.length > this.config.maxContext) {
      const queryLength = query.length;
      const remainingLength = this.config.maxContext - queryLength - 50;
      if (remainingLength > 0 && context) {
        const truncatedContext = context.substring(0, remainingLength) + '...';
        fullQuery = `Context: ${truncatedContext}\n\nQuestion: ${query}`;
      }
    }

    return fullQuery;
  }

  private async executeStreamingCommand(
    query: string,
    options: StreamingOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ['-m', this.config.model];
      
      if (this.config.debug) {
        console.error(`Executing: ${this.config.cliCommand} ${args.join(' ')}`);
      }

      this.activeProcess = spawn(this.config.cliCommand, args);

      let hasErrored = false;
      let stderr = '';
      let processExited = false;
      let timeoutId: NodeJS.Timeout;

      // Setup timeout handler
      const timeoutHandler = () => {
        if (!processExited && this.activeProcess) {
          processExited = true;
          try {
            this.activeProcess.kill('SIGKILL');
          } catch (e) {
            // Process might already be dead
          }
          const error = new Error(`Gemini CLI command timed out after ${this.config.timeout} seconds`);
          if (!hasErrored) {
            hasErrored = true;
            options.onError?.(error);
            this.emit('error', error);
            reject(error);
          }
        }
      };

      // Set timeout - use 5 minutes minimum for streaming
      const timeoutMs = Math.max(this.config.timeout * 1000, 300000);
      timeoutId = setTimeout(timeoutHandler, timeoutMs);

      // Handle process exit
      const cleanup = () => {
        processExited = true;
        clearTimeout(timeoutId);
      };

      // Send the query to stdin
      try {
        if (this.activeProcess.stdin) {
          this.activeProcess.stdin.write(query);
          this.activeProcess.stdin.end();
        }
      } catch (error) {
        cleanup();
        const err = new Error(`Failed to write to Gemini CLI stdin: ${error}`);
        options.onError?.(err);
        reject(err);
        return;
      }

      // Stream stdout data
      if (this.activeProcess.stdout) {
        this.activeProcess.stdout.on('data', (chunk) => {
          const text = chunk.toString();
          options.onData(text);
          this.emit('data', text);
        });
      }

      // Handle stderr
      if (this.activeProcess.stderr) {
        this.activeProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      // Handle process errors
      this.activeProcess.on('error', (error) => {
        cleanup();
        if (!hasErrored) {
          hasErrored = true;
          options.onError?.(error);
          this.emit('error', error);
          reject(error);
        }
      });

      // Handle process close
      this.activeProcess.on('close', (code) => {
        cleanup();
        this.activeProcess = undefined;
        
        if (code !== 0 && !hasErrored) {
          let error: Error;
          if (stderr.includes('PERMISSION_DENIED') || stderr.includes('SERVICE_DISABLED')) {
            error = new Error('Gemini API is not enabled or authentication failed. Please check your Google Cloud setup.');
          } else {
            error = new Error(`Gemini CLI exited with code ${code}: ${stderr.substring(0, 500)}`);
          }
          options.onError?.(error);
          this.emit('error', error);
          reject(error);
        } else {
          options.onEnd?.();
          this.emit('end');
          resolve();
        }
      });
    });
  }

  stopStreaming(): void {
    if (this.activeProcess) {
      this.activeProcess.kill();
      this.activeProcess = undefined;
    }
  }

  isStreaming(): boolean {
    return !!this.activeProcess;
  }
}