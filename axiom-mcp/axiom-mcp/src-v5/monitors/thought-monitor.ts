/**
 * Thought Monitor - Real-time pattern detection for Claude's output stream
 * 
 * Monitors character-by-character PTY output to detect:
 * - Planning behavior in execution phase
 * - Research loops
 * - TODO violations  
 * - Success patterns
 * - Stall patterns
 */

import { EventEmitter } from 'events';

export interface ThoughtPattern {
  type: 'planning' | 'research-loop' | 'todo-violation' | 'success' | 'stall';
  pattern: string | RegExp;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  action?: 'log' | 'warn' | 'interrupt' | 'redirect';
}

export interface DetectedThought {
  pattern: ThoughtPattern;
  matched: string;
  timestamp: number;
  context: string; // surrounding text
  streamPosition: number;
}

export interface ThoughtMonitorConfig {
  bufferSize?: number; // characters to keep in buffer
  stallTimeout?: number; // ms before detecting stall
  contextWindow?: number; // characters before/after match
  debugMode?: boolean;
}

export class ThoughtMonitor extends EventEmitter {
  private buffer: string = '';
  private readonly patterns: ThoughtPattern[] = [];
  private lastActivityTime: number = Date.now();
  private stallTimer?: NodeJS.Timeout;
  private streamPosition: number = 0;
  private recentMatches: Map<string, number> = new Map(); // pattern -> count
  private fileAccessLog: Map<string, number> = new Map(); // filename -> access count
  
  constructor(private config: ThoughtMonitorConfig = {}) {
    super();
    this.config = {
      bufferSize: 4096,
      stallTimeout: 30000, // 30 seconds
      contextWindow: 100,
      debugMode: false,
      ...config
    };
    
    this.initializePatterns();
    this.startStallDetection();
  }
  
  private initializePatterns(): void {
    // Planning behavior patterns
    this.addPattern({
      type: 'planning',
      pattern: /\b(I would|I could|I should|Let me think|Let me plan|I'll need to|First, I'll)\b/i,
      description: 'Detected planning language instead of execution',
      severity: 'warning',
      action: 'warn'
    });
    
    this.addPattern({
      type: 'planning',
      pattern: /\b(Here's my approach|My strategy|The plan is|I propose)\b/i,
      description: 'Detected strategic planning instead of implementation',
      severity: 'warning',
      action: 'warn'
    });
    
    // Research loop patterns
    this.addPattern({
      type: 'research-loop',
      pattern: /Let me check.*again/i,
      description: 'Detected repeated checking behavior',
      severity: 'warning',
      action: 'warn'
    });
    
    this.addPattern({
      type: 'research-loop',
      pattern: /I need to understand.*better/i,
      description: 'Detected endless research pattern',
      severity: 'warning',
      action: 'warn'
    });
    
    // TODO violation patterns
    this.addPattern({
      type: 'todo-violation',
      pattern: /\bTODO:|FIXME:|TODO\s*\(/i,
      description: 'Detected TODO instead of implementation',
      severity: 'error',
      action: 'interrupt'
    });
    
    this.addPattern({
      type: 'todo-violation',
      pattern: /\b(implement later|add implementation|needs implementation)\b/i,
      description: 'Detected deferred implementation',
      severity: 'error',
      action: 'interrupt'
    });
    
    // Success patterns
    this.addPattern({
      type: 'success',
      pattern: /\b(Created file|Successfully created|File written|Wrote \d+ bytes)\b/i,
      description: 'Detected successful file creation',
      severity: 'info',
      action: 'log'
    });
    
    this.addPattern({
      type: 'success',
      pattern: /\b(Test passed|All tests pass|✓|✔)\b/,
      description: 'Detected test success',
      severity: 'info',
      action: 'log'
    });
    
    this.addPattern({
      type: 'success',
      pattern: /\b(Implementation complete|Task completed|Done)\b/i,
      description: 'Detected task completion',
      severity: 'info',
      action: 'log'
    });
  }
  
  public addPattern(pattern: ThoughtPattern): void {
    this.patterns.push(pattern);
  }
  
  public removePattern(type: string, pattern: string | RegExp): void {
    const idx = this.patterns.findIndex(p => 
      p.type === type && p.pattern.toString() === pattern.toString()
    );
    if (idx >= 0) {
      this.patterns.splice(idx, 1);
    }
  }
  
  /**
   * Process a character from the PTY stream
   */
  public processChar(char: string): void {
    this.lastActivityTime = Date.now();
    this.streamPosition++;
    
    // Add to buffer
    this.buffer += char;
    
    // Trim buffer if too large
    if (this.buffer.length > this.config.bufferSize!) {
      this.buffer = this.buffer.slice(-this.config.bufferSize!);
    }
    
    // Check for newline to trigger pattern matching on complete lines
    if (char === '\n' || char === '\r') {
      this.checkPatterns();
    }
    
    // Also check patterns periodically for partial matches
    if (this.streamPosition % 100 === 0) {
      this.checkPatterns();
    }
  }
  
  /**
   * Process a chunk of text (for batch processing)
   */
  public processChunk(chunk: string): void {
    for (const char of chunk) {
      this.processChar(char);
    }
  }
  
  private checkPatterns(): void {
    const recentBuffer = this.buffer.slice(-1000); // Check last 1000 chars
    
    for (const pattern of this.patterns) {
      const regex = pattern.pattern instanceof RegExp 
        ? pattern.pattern 
        : new RegExp(pattern.pattern, 'i');
      
      const match = recentBuffer.match(regex);
      if (match) {
        // Check if we've seen this recently to avoid spam
        const key = `${pattern.type}:${match[0]}`;
        const lastSeen = this.recentMatches.get(key) || 0;
        const now = Date.now();
        
        if (now - lastSeen > 5000) { // 5 second cooldown
          this.recentMatches.set(key, now);
          
          const detection: DetectedThought = {
            pattern,
            matched: match[0],
            timestamp: now,
            context: this.getContext(match.index || 0, match[0].length),
            streamPosition: this.streamPosition
          };
          
          this.handleDetection(detection);
        }
      }
    }
    
    // Check for research loops by analyzing file access patterns
    this.checkFileAccessPatterns();
  }
  
  private checkFileAccessPatterns(): void {
    // Look for file access patterns in buffer
    const fileAccessRegex = /\b(Reading|Checking|Opening|Accessing)\s+(?:file\s+)?([\/\w\-\.]+\.\w+)/gi;
    let match;
    
    while ((match = fileAccessRegex.exec(this.buffer)) !== null) {
      const filename = match[2];
      const count = (this.fileAccessLog.get(filename) || 0) + 1;
      this.fileAccessLog.set(filename, count);
      
      // If same file accessed more than 3 times, it's a research loop
      if (count > 3) {
        const detection: DetectedThought = {
          pattern: {
            type: 'research-loop',
            pattern: 'Repeated file access',
            description: `File ${filename} accessed ${count} times`,
            severity: 'warning',
            action: 'warn'
          },
          matched: match[0],
          timestamp: Date.now(),
          context: this.getContext(match.index, match[0].length),
          streamPosition: this.streamPosition
        };
        
        this.handleDetection(detection);
        this.fileAccessLog.delete(filename); // Reset counter
      }
    }
  }
  
  private getContext(index: number, length: number): string {
    const start = Math.max(0, index - this.config.contextWindow!);
    const end = Math.min(this.buffer.length, index + length + this.config.contextWindow!);
    return this.buffer.slice(start, end);
  }
  
  private handleDetection(detection: DetectedThought): void {
    if (this.config.debugMode) {
      console.log(`[ThoughtMonitor] Detected: ${detection.pattern.type} - ${detection.pattern.description}`);
    }
    
    // Emit specific event for pattern type
    this.emit(`pattern:${detection.pattern.type}`, detection);
    
    // Emit general detection event
    this.emit('detection', detection);
    
    // Take action based on pattern configuration
    switch (detection.pattern.action) {
      case 'interrupt':
        this.emit('interrupt-required', detection);
        break;
      case 'redirect':
        this.emit('redirect-required', detection);
        break;
      case 'warn':
        this.emit('warning', detection);
        break;
      case 'log':
        this.emit('info', detection);
        break;
    }
  }
  
  private startStallDetection(): void {
    this.stallTimer = setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivityTime;
      
      if (timeSinceActivity > this.config.stallTimeout!) {
        const detection: DetectedThought = {
          pattern: {
            type: 'stall',
            pattern: 'No output detected',
            description: `No activity for ${Math.floor(timeSinceActivity / 1000)} seconds`,
            severity: 'critical',
            action: 'interrupt'
          },
          matched: '[STALL DETECTED]',
          timestamp: Date.now(),
          context: this.buffer.slice(-200), // Last 200 chars
          streamPosition: this.streamPosition
        };
        
        this.handleDetection(detection);
        
        // Reset timer after detection
        this.lastActivityTime = Date.now();
      }
    }, 5000); // Check every 5 seconds
  }
  
  /**
   * Get current statistics
   */
  public getStats(): {
    streamPosition: number;
    bufferSize: number;
    detectionCounts: Record<string, number>;
    lastActivityTime: number;
  } {
    const detectionCounts: Record<string, number> = {};
    
    for (const [key, _time] of this.recentMatches) {
      const [type] = key.split(':');
      detectionCounts[type] = (detectionCounts[type] || 0) + 1;
    }
    
    return {
      streamPosition: this.streamPosition,
      bufferSize: this.buffer.length,
      detectionCounts,
      lastActivityTime: this.lastActivityTime
    };
  }
  
  /**
   * Reset the monitor state
   */
  public reset(): void {
    this.buffer = '';
    this.streamPosition = 0;
    this.lastActivityTime = Date.now();
    this.recentMatches.clear();
    this.fileAccessLog.clear();
  }
  
  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.stallTimer) {
      clearInterval(this.stallTimer);
    }
    this.removeAllListeners();
  }
}

// Export factory function for easy creation
export function createThoughtMonitor(config?: ThoughtMonitorConfig): ThoughtMonitor {
  return new ThoughtMonitor(config);
}