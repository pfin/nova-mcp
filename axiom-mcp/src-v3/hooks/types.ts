/**
 * Type definitions for Axiom MCP v3 Hook System
 */

import { ConversationDB } from '../database/conversation-db.js';
import { EventBus } from '../core/event-bus.js';
import { StatusManager } from '../managers/status-manager.js';

/**
 * Hook SDK for easy hook development
 */
export class HookSDK {
  constructor(
    private db: ConversationDB,
    private eventBus: EventBus,
    private statusManager: StatusManager
  ) {}
  
  /**
   * Query the conversation database
   */
  async queryDatabase(query: {
    type: 'conversations' | 'actions' | 'streams' | 'violations';
    filter?: Record<string, any>;
    limit?: number;
  }): Promise<any[]> {
    switch (query.type) {
      case 'conversations':
        return this.db.getActiveConversations();
      case 'actions':
        return this.db.getRecentActions(query.limit || 10);
      case 'violations':
        // Query for pattern violations
        const stats = await this.db.getStats();
        return [stats.violationsByType];
      default:
        return [];
    }
  }
  
  /**
   * Inject a command into the active PTY session
   */
  async injectCommand(taskId: string, command: string): Promise<void> {
    this.eventBus.logEvent({
      taskId,
      workerId: 'hook-sdk',
      event: 'command_injection',
      payload: { command }
    });
  }
  
  /**
   * Get active execution streams
   */
  async getActiveStreams(): Promise<Array<{
    taskId: string;
    status: string;
    output: string;
  }>> {
    const tasks = this.statusManager.getActiveTasks();
    return tasks.map(task => ({
      taskId: task.id,
      status: task.status,
      output: task.output || ''
    }));
  }
  
  /**
   * Trigger an intervention
   */
  async triggerIntervention(type: string, data?: any): Promise<void> {
    this.eventBus.logEvent({
      taskId: 'system',
      workerId: 'hook-sdk',
      event: 'intervention_triggered',
      payload: { type, data }
    });
  }
  
  /**
   * Log a custom event
   */
  async logEvent(event: string, data: any): Promise<void> {
    this.eventBus.logEvent({
      taskId: 'hook',
      workerId: 'hook-sdk',
      event,
      payload: data
    });
  }
  
  /**
   * Get task statistics
   */
  async getTaskStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    return this.statusManager.getStats();
  }
  
  /**
   * Check if a pattern exists in recent output
   */
  async hasPattern(pattern: RegExp, windowSize: number = 100): Promise<boolean> {
    const actions = await this.db.getRecentActions(windowSize);
    return actions.some(action => 
      action.content && pattern.test(action.content)
    );
  }
  
  /**
   * Get configuration value
   */
  async getConfig(key: string): Promise<any> {
    // This would connect to the settings system
    return null;
  }
  
  /**
   * Set configuration value
   */
  async setConfig(key: string, value: any): Promise<void> {
    // This would connect to the settings system
  }
}

/**
 * Base class for native hooks
 */
export abstract class NativeHook {
  abstract name: string;
  abstract event: string;
  priority: number = 100;
  enabled: boolean = true;
  
  constructor(protected sdk: HookSDK) {}
  
  abstract handle(context: any): Promise<{
    continue: boolean;
    block?: boolean;
    reason?: string;
    modifiedArgs?: any;
    intervention?: any;
  }>;
}

/**
 * Intervention types for hooks
 */
export enum InterventionType {
  INJECT_COMMAND = 'inject_command',
  MODIFY_PROMPT = 'modify_prompt',
  BLOCK_EXECUTION = 'block_execution',
  FORCE_IMPLEMENTATION = 'force_implementation',
  ADD_CONTEXT = 'add_context',
  TRIGGER_VERIFICATION = 'trigger_verification'
}

/**
 * Pattern detection helpers
 */
export const COMMON_PATTERNS = {
  TODO: /\b(TODO|FIXME|XXX)\b/i,
  PLANNING: /\b(would|could|might|should)\s+(implement|create|build)/i,
  RESEARCH: /^(research|explore|investigate|consider|look into)/i,
  ERROR: /\b(error|exception|failed|failure)\b/i,
  SUCCESS: /\b(success|complete|passed|created|updated)\b/i,
  FILE_OPERATION: /(created|updated|modified|deleted)\s+.*\.(ts|js|py|md)/i,
  NO_IMPLEMENTATION: /\b(no\s+implementation|not\s+implemented)\b/i
};

/**
 * Hook development utilities
 */
export class HookUtils {
  /**
   * Extract file paths from text
   */
  static extractFilePaths(text: string): string[] {
    const pattern = /[a-zA-Z0-9_\-\/]+\.(ts|tsx|js|jsx|py|rs|go|md|json|yaml|yml)/g;
    return text.match(pattern) || [];
  }
  
  /**
   * Check if prompt has concrete deliverables
   */
  static hasConcreteDeliverables(prompt: string): boolean {
    // Must have action verb
    const hasAction = /\b(create|implement|build|write|fix|add|update)\b/i.test(prompt);
    
    // Must have specific target
    const hasTarget = this.extractFilePaths(prompt).length > 0 ||
                     /\b(component|function|class|module|endpoint|api)\b/i.test(prompt);
    
    return hasAction && hasTarget;
  }
  
  /**
   * Generate improvement suggestion
   */
  static generateSuggestion(prompt: string): string {
    if (!this.hasConcreteDeliverables(prompt)) {
      if (!/\b(create|implement|build)\b/i.test(prompt)) {
        return "Start with an action verb: create, implement, build, fix, etc.";
      }
      if (this.extractFilePaths(prompt).length === 0) {
        return "Specify files to create: auth.ts, UserLogin.tsx, etc.";
      }
    }
    return "";
  }
  
  /**
   * Color code output for terminal
   */
  static colorize(text: string, color: 'red' | 'green' | 'yellow' | 'blue'): string {
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m'
    };
    return `${colors[color]}${text}\x1b[0m`;
  }
}