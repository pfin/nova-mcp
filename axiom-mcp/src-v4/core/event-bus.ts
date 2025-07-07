import * as fs from 'fs/promises';
import * as path from 'path';
import { HookEvent } from './hook-orchestrator.js';

export interface EventLogEntry {
  timestamp: string;
  taskId: string;
  workerId: string;
  event: string;
  payload: any;
}

export class EventBus {
  private logStream?: fs.FileHandle;
  private logPath: string;
  private hookOrchestrator?: any;
  
  constructor(logsDir: string = 'logs-v4') {
    this.logPath = path.join(logsDir, `axiom-events-${Date.now()}.jsonl`);
  }
  
  // v4 addition: Set hook orchestrator
  setHookOrchestrator(orchestrator: any): void {
    this.hookOrchestrator = orchestrator;
  }
  
  async initialize(): Promise<void> {
    // Ensure logs directory exists
    await fs.mkdir(path.dirname(this.logPath), { recursive: true });
    
    // Open log file for appending
    this.logStream = await fs.open(this.logPath, 'a');
    
    // Only log in debug mode
    if (process.env.AXIOM_LOG_LEVEL === 'DEBUG' || process.env.AXIOM_LOG_LEVEL === 'TRACE') {
      console.error(`[EventBus] Logging to ${this.logPath}`);
    }
  }
  
  async logEvent(entry: EventLogEntry): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    
    if (this.logStream) {
      await this.logStream.write(line);
    }
    
    // v4: Trigger hooks for event logging
    if (this.hookOrchestrator) {
      await this.hookOrchestrator.triggerHooks('EVENT_LOGGED', { entry });
    }
    
    // Also log critical events to stderr
    if (entry.event === 'error' || entry.event === 'intervention') {
      console.error(`[EventBus] ${entry.event}:`, entry.payload);
    }
  }
  
  async getRecentEvents(limit: number = 100): Promise<EventLogEntry[]> {
    try {
      const content = await fs.readFile(this.logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l);
      const events = lines.slice(-limit).map(line => JSON.parse(line));
      return events;
    } catch (error) {
      return [];
    }
  }
  
  async searchEvents(filter: {
    taskId?: string;
    event?: string;
    startTime?: string;
    endTime?: string;
  }): Promise<EventLogEntry[]> {
    try {
      const content = await fs.readFile(this.logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l);
      
      return lines
        .map(line => JSON.parse(line))
        .filter(entry => {
          if (filter.taskId && entry.taskId !== filter.taskId) return false;
          if (filter.event && entry.event !== filter.event) return false;
          if (filter.startTime && entry.timestamp < filter.startTime) return false;
          if (filter.endTime && entry.timestamp > filter.endTime) return false;
          return true;
        });
    } catch (error) {
      return [];
    }
  }
  
  async getEventStats(): Promise<Record<string, number>> {
    try {
      const content = await fs.readFile(this.logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l);
      
      const stats: Record<string, number> = {};
      
      for (const line of lines) {
        const entry = JSON.parse(line);
        stats[entry.event] = (stats[entry.event] || 0) + 1;
      }
      
      return stats;
    } catch (error) {
      return {};
    }
  }
  
  async close(): Promise<void> {
    if (this.logStream) {
      await this.logStream.close();
    }
  }
}