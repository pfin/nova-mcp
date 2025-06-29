import { spawn } from 'child_process';
import { GeminiConfig, ConsultationResult, GeminiStatus } from './types/index.js';
import { RateLimiter } from './utils/rate-limiter.js';
import { detectUncertainty } from './utils/patterns.js';

export class GeminiIntegration {
  private config: GeminiConfig;
  private rateLimiter: RateLimiter;
  private consultationCount: number = 0;
  private lastConsultation?: Date;
  private consultationCache: Map<string, ConsultationResult> = new Map();

  constructor(config: Partial<GeminiConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? (process.env.GEMINI_ENABLED !== 'false'),
      autoConsult: config.autoConsult ?? (process.env.GEMINI_AUTO_CONSULT !== 'false'),
      cliCommand: config.cliCommand ?? process.env.GEMINI_CLI_COMMAND ?? 'gemini',
      timeout: config.timeout ?? parseInt(process.env.GEMINI_TIMEOUT ?? '60'),
      rateLimitDelay: config.rateLimitDelay ?? parseInt(process.env.GEMINI_RATE_LIMIT ?? '2'),
      model: config.model ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-pro',
      maxContext: config.maxContext ?? (process.env.GEMINI_MAX_CONTEXT ? parseInt(process.env.GEMINI_MAX_CONTEXT) : undefined),
      debug: config.debug ?? (process.env.GEMINI_DEBUG === 'true'),
    };

    this.rateLimiter = new RateLimiter(this.config.rateLimitDelay);
  }

  async consultGemini(query: string, context?: string): Promise<ConsultationResult> {
    const startTime = Date.now();

    if (!this.config.enabled) {
      return {
        response: 'Gemini integration is disabled',
        timestamp: startTime,
        query,
        context,
        model: this.config.model,
        executionTime: 0,
        error: 'Integration disabled',
      };
    }

    // Check cache
    const cacheKey = `${query}:${context || ''}`;
    const cached = this.consultationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 minute cache
      return cached;
    }

    try {
      // Rate limiting
      await this.rateLimiter.wait();

      // Prepare the full query
      const fullQuery = this.prepareQuery(query, context);

      // Execute Gemini CLI command
      const response = await this.executeGeminiCommand(fullQuery);

      const result: ConsultationResult = {
        response,
        timestamp: startTime,
        query,
        context,
        model: this.config.model,
        executionTime: Date.now() - startTime,
      };

      // Update statistics
      this.consultationCount++;
      this.lastConsultation = new Date();

      // Cache the result
      this.consultationCache.set(cacheKey, result);

      return result;
    } catch (error) {
      return {
        response: '',
        timestamp: startTime,
        query,
        context,
        model: this.config.model,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
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
      const remainingLength = this.config.maxContext - queryLength - 50; // Buffer for formatting
      if (remainingLength > 0 && context) {
        const truncatedContext = context.substring(0, remainingLength) + '...';
        fullQuery = `Context: ${truncatedContext}\n\nQuestion: ${query}`;
      }
    }

    return fullQuery;
  }

  private async executeGeminiCommand(query: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = ['-m', this.config.model];
      
      if (this.config.debug) {
        console.log(`Executing: ${this.config.cliCommand} ${args.join(' ')}`);
      }

      const geminiProcess = spawn(this.config.cliCommand, args, {
        timeout: this.config.timeout * 1000,
      });

      let stdout = '';
      let stderr = '';

      // Send the query to stdin
      geminiProcess.stdin.write(query);
      geminiProcess.stdin.end();

      geminiProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      geminiProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      geminiProcess.on('error', (error) => {
        reject(new Error(`Failed to execute Gemini CLI: ${error.message}`));
      });

      geminiProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Gemini CLI exited with code ${code}: ${stderr}`));
        } else {
          resolve(stdout.trim());
        }
      });

      // Handle timeout
      setTimeout(() => {
        geminiProcess.kill();
        reject(new Error(`Gemini CLI command timed out after ${this.config.timeout} seconds`));
      }, this.config.timeout * 1000);
    });
  }

  checkForUncertainty(text: string): boolean {
    if (!this.config.autoConsult) {
      return false;
    }
    const detection = detectUncertainty(text);
    return detection.hasUncertainty;
  }

  getStatus(): GeminiStatus {
    return {
      enabled: this.config.enabled,
      autoConsult: this.config.autoConsult,
      model: this.config.model,
      consultationCount: this.consultationCount,
      lastConsultation: this.lastConsultation,
      rateLimitDelay: this.config.rateLimitDelay,
      timeout: this.config.timeout,
    };
  }

  toggleAutoConsult(enable: boolean): void {
    this.config.autoConsult = enable;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  isAutoConsultEnabled(): boolean {
    return this.config.autoConsult;
  }
}