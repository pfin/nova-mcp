/**
 * Thought Monitor - Real-time Pattern Detection
 * 
 * Monitors character-by-character output for intervention patterns
 */

import { EventEmitter } from 'events';

export interface Pattern {
  id: string;
  pattern: RegExp;
  action: 'log' | 'warn' | 'interrupt' | 'redirect';
  message?: string;
  phase?: string; // Optional phase restriction
}

export interface Detection {
  patternId: string;
  match: string;
  timestamp: number;
  action: string;
  bufferSnapshot: string;
}

export class ThoughtMonitor extends EventEmitter {
  private buffer: string = '';
  private patterns: Pattern[] = [];
  private detectionHistory: Detection[] = [];
  private lastActivity: number = Date.now();
  private fileAccessCount: Map<string, number> = new Map();
  
  constructor(private maxBufferSize: number = 10000) {
    super();
    this.initializeDefaultPatterns();
  }
  
  private initializeDefaultPatterns() {
    // Planning behavior patterns
    this.patterns.push(
      {
        id: 'planning_would',
        pattern: /I would\s+(create|implement|design|build)/i,
        action: 'interrupt',
        message: 'Stop planning! Create it NOW!'
      },
      {
        id: 'planning_think',
        pattern: /Let me (think|consider|analyze)/i,
        action: 'interrupt',
        message: 'No thinking! Execute immediately!'
      },
      {
        id: 'planning_approach',
        pattern: /approach would be|best approach|consider the following/i,
        action: 'interrupt',
        message: 'Stop considering approaches! Pick one and BUILD!'
      }
    );
    
    // TODO violations
    this.patterns.push(
      {
        id: 'todo_basic',
        pattern: /TODO:|FIXME:|XXX:/,
        action: 'interrupt',
        message: 'NO TODOs! Implement fully or not at all!'
      },
      {
        id: 'todo_later',
        pattern: /implement later|add later|fix later/i,
        action: 'interrupt',
        message: 'No "later"! Implement NOW!'
      }
    );
    
    // Research loops
    this.patterns.push(
      {
        id: 'research_loop',
        pattern: /examining the same|already checked|let me check again/i,
        action: 'warn',
        message: 'Research loop detected'
      }
    );
    
    // Success patterns
    this.patterns.push(
      {
        id: 'file_created',
        pattern: /file created:|created file:|successfully created/i,
        action: 'log'
      },
      {
        id: 'test_passed',
        pattern: /test passed|all tests pass|✓/,
        action: 'log'
      }
    );
  }
  
  /**
   * Process a character of output
   */
  processChar(char: string): void {
    this.buffer += char;
    this.lastActivity = Date.now();
    
    // Trim buffer if too large
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.maxBufferSize);
    }
    
    // Check patterns
    this.checkPatterns();
    
    // Track file access
    this.trackFileAccess();
  }
  
  /**
   * Process a chunk of output
   */
  processChunk(chunk: string): void {
    for (const char of chunk) {
      this.processChar(char);
    }
  }
  
  /**
   * Check for pattern matches
   */
  private checkPatterns(): void {
    const recentBuffer = this.buffer.slice(-1000); // Check last 1000 chars
    
    for (const pattern of this.patterns) {
      const match = recentBuffer.match(pattern.pattern);
      if (match) {
        const detection: Detection = {
          patternId: pattern.id,
          match: match[0],
          timestamp: Date.now(),
          action: pattern.action,
          bufferSnapshot: recentBuffer
        };
        
        this.detectionHistory.push(detection);
        this.emit('detection', detection);
        
        // Take action
        switch (pattern.action) {
          case 'interrupt':
            this.emit('interrupt', {
              pattern: pattern.id,
              message: pattern.message || 'Pattern violation detected'
            });
            break;
          case 'warn':
            this.emit('warning', {
              pattern: pattern.id,
              message: pattern.message || 'Warning pattern detected'
            });
            break;
          case 'redirect':
            this.emit('redirect', {
              pattern: pattern.id,
              message: pattern.message
            });
            break;
        }
      }
    }
  }
  
  /**
   * Track file access patterns
   */
  private trackFileAccess(): void {
    const filePattern = /(?:reading|checking|examining)\s+([^\s]+\.[a-z]+)/gi;
    const matches = this.buffer.matchAll(filePattern);
    
    for (const match of matches) {
      const file = match[1];
      const count = (this.fileAccessCount.get(file) || 0) + 1;
      this.fileAccessCount.set(file, count);
      
      if (count > 3) {
        this.emit('researchLoop', {
          file,
          count,
          message: `File ${file} checked ${count} times`
        });
      }
    }
  }
  
  /**
   * Check for stalls
   */
  checkStall(threshold: number = 30000): boolean {
    const timeSinceActivity = Date.now() - this.lastActivity;
    if (timeSinceActivity > threshold) {
      this.emit('stall', {
        duration: timeSinceActivity,
        lastBuffer: this.buffer.slice(-200)
      });
      return true;
    }
    return false;
  }
  
  /**
   * Add custom pattern
   */
  addPattern(pattern: Pattern): void {
    this.patterns.push(pattern);
  }
  
  /**
   * Get detection history
   */
  getHistory(): Detection[] {
    return [...this.detectionHistory];
  }
  
  /**
   * Clear buffer and history
   */
  reset(): void {
    this.buffer = '';
    this.detectionHistory = [];
    this.fileAccessCount.clear();
    this.lastActivity = Date.now();
  }
  
  /**
   * Get current buffer
   */
  getBuffer(): string {
    return this.buffer;
  }
}

// Export factory function
export function createThoughtMonitor(maxBufferSize?: number): ThoughtMonitor {
  return new ThoughtMonitor(maxBufferSize);
}