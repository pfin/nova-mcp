/**
 * Enhanced logging system for Axiom v4
 * Provides maximum visibility into all operations
 */

import * as util from 'util';

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  method: string;
  message: string;
  data?: any;
  duration?: number;
  taskId?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.WARN; // Default to WARN for quiet operation
  private startTimes: Map<string, number> = new Map();
  private silent: boolean = false;
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  private constructor() {
    // Check for env var to set log level
    const envLevel = process.env.AXIOM_LOG_LEVEL;
    if (envLevel && envLevel in LogLevel) {
      this.logLevel = LogLevel[envLevel as keyof typeof LogLevel];
    }
    
    // Check if we should be completely silent (for MCP)
    this.silent = process.env.AXIOM_SILENT === 'true' || 
                  (!process.env.AXIOM_LOG_LEVEL && !process.env.AXIOM_CONSOLE_LOG);
  }
  
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
  
  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }
  
  private formatMessage(entry: LogEntry): string {
    const level = LogLevel[entry.level];
    const time = new Date(entry.timestamp).toLocaleTimeString();
    
    // Compact, readable format
    let message = `${this.colorize(`[${level}]`, entry.level)} ${entry.message}`;
    
    // Add task ID if present
    if (entry.taskId) {
      message = `[${entry.taskId.slice(-8)}] ${message}`;
    }
    
    // Add duration if present
    if (entry.duration !== undefined) {
      message += ` ${this.colorize(`(${entry.duration}ms)`, 'duration')}`;
    }
    
    // Only show data in DEBUG or TRACE mode
    if (entry.data && this.logLevel <= LogLevel.DEBUG) {
      const dataStr = util.inspect(entry.data, { depth: 1, colors: true, compact: true });
      message += `\n  → ${dataStr}`;
    }
    
    return message;
  }
  
  private colorize(text: string, type: string | LogLevel): string {
    const colors: Record<string | number, string> = {
      [LogLevel.TRACE]: '\x1b[90m',   // Gray
      [LogLevel.DEBUG]: '\x1b[36m',   // Cyan
      [LogLevel.INFO]: '\x1b[32m',    // Green
      [LogLevel.WARN]: '\x1b[33m',    // Yellow
      [LogLevel.ERROR]: '\x1b[31m',   // Red
      [LogLevel.FATAL]: '\x1b[35m',   // Magenta
      'component': '\x1b[34m',        // Blue
      'duration': '\x1b[33m',         // Yellow
      'reset': '\x1b[0m'
    };
    
    const color = colors[type] || colors.reset;
    return `${color}${text}${colors.reset}`;
  }
  
  trace(component: string, method: string, message: string, data?: any, taskId?: string): void {
    this.log(LogLevel.TRACE, component, method, message, data, taskId);
  }
  
  debug(component: string, method: string, message: string, data?: any, taskId?: string): void {
    this.log(LogLevel.DEBUG, component, method, message, data, taskId);
  }
  
  info(component: string, method: string, message: string, data?: any, taskId?: string): void {
    this.log(LogLevel.INFO, component, method, message, data, taskId);
  }
  
  warn(component: string, method: string, message: string, data?: any, taskId?: string): void {
    this.log(LogLevel.WARN, component, method, message, data, taskId);
  }
  
  error(component: string, method: string, message: string, data?: any, taskId?: string): void {
    this.log(LogLevel.ERROR, component, method, message, data, taskId);
  }
  
  fatal(component: string, method: string, message: string, data?: any, taskId?: string): void {
    this.log(LogLevel.FATAL, component, method, message, data, taskId);
  }
  
  startTimer(key: string): void {
    this.startTimes.set(key, Date.now());
  }
  
  endTimer(key: string): number | undefined {
    const startTime = this.startTimes.get(key);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.startTimes.delete(key);
      return duration;
    }
    return undefined;
  }
  
  private log(level: LogLevel, component: string, method: string, message: string, data?: any, taskId?: string): void {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      method,
      message,
      data,
      taskId
    };
    
    // Only output if not silent
    if (!this.silent) {
      console.error(this.formatMessage(entry));
    }
  }
  
  // Special formatting for stream data
  logStream(component: string, taskId: string, data: string, metadata?: any): void {
    // Only show stream in TRACE mode
    if (!this.shouldLog(LogLevel.TRACE)) return;
    
    // Don't log empty lines
    const trimmed = data.trim();
    if (!trimmed) return;
    
    // Simple one-line format
    console.error(`${this.colorize('[STREAM]', LogLevel.TRACE)} ${trimmed}`);
    
    // Show patterns only in DEBUG mode
    if (metadata?.patterns && this.logLevel <= LogLevel.DEBUG) {
      for (const pattern of metadata.patterns) {
        console.error(`  ${this.colorize('→', LogLevel.WARN)} ${pattern} detected`);
      }
    }
  }
  
  // Log hook execution
  logHook(hookName: string, event: string, phase: 'start' | 'end', result?: any): void {
    // Only log hooks in DEBUG mode
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    // Only log hook completions with non-continue results
    if (phase === 'end' && result?.action === 'continue') return;
    
    const icon = phase === 'start' ? '→' : '✓';
    const message = `${icon} ${hookName}: ${event}`;
    
    if (result?.action && result.action !== 'continue') {
      this.warn('Hook', hookName, `${message} [${result.action}]`, result);
    } else {
      this.debug('Hook', hookName, message);
    }
  }
  
  // Log metrics
  logMetrics(component: string, metrics: Record<string, number>): void {
    const formatted = Object.entries(metrics)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
      
    this.info(component, 'metrics', formatted);
  }
}